-- Sliding Window Rate Limiter (Atomic Redis Lua Script)
-- KEYS[1]: Rate limit key (e.g. rl:ip:203.0.113.5:login)
-- ARGV[1]: Current timestamp in milliseconds (now_ms)
-- ARGV[2]: Window size in milliseconds (window_ms)
-- ARGV[3]: Maximum allowed requests in window (limit)
-- ARGV[4]: Unique request UUID to avoid same-ms collisions (req_id)

local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local req_id = ARGV[4]

-- 1. Remove timestamps outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)

-- 2. Count requests remaining in the current window
local current_requests = redis.call('ZCARD', key)

if current_requests < limit then
    -- 3. Add current request with timestamp as score and unique UUID as member
    redis.call('ZADD', key, now, req_id)
    -- 4. Set TTL to window size so idle keys auto-expire
    redis.call('PEXPIRE', key, window)
    return {1, limit - current_requests - 1}
end

-- Rate limit exceeded
return {0, 0}

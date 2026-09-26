import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
   windowMs: 10 * 60 * 1000,
   limit: 500,
   standardHeaders: 'draft-7',
   legacyHeaders: false,
   message: 'Too many request, please try again later',
});

export default limiter;

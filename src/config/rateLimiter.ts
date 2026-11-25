import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
   windowMs: 10 * 60 * 1000,
   limit: 500,
   standardHeaders: 'draft-7',
   legacyHeaders: false,
   message: 'Too many request, please try again later',
   handler: (req, res, _next, { statusCode, message }) => {
      if (/^\/api\/public(?:\/|$)/i.test(req.path)) {
         res.set('Cache-Control', 'no-store')
            .status(statusCode)
            .json({
               error: { code: 'RATE_LIMITED', message: 'Too many requests' },
            });
         return;
      }
      res.status(statusCode).send(message);
   },
});

export default limiter;

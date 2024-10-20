const fetch = (...args) => import('node-fetch').then(module => module.default(...args));

module.exports = async (req, res, next) => {
  const token = req.body.recaptchaToken;
  
  //console.log("Recaptcha token:", token);  // Log the token

  const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET}&response=${token}`);
  const data = await response.json();

  //console.log("Recaptcha verification response:", data);  // Log the response

  if (!data.success) {
    return res.status(400).json({ message: 'Recaptcha failed' });
  }
  
  next();
};

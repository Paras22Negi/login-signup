const jwt = require("jsonwebtoken");


const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("No token received"); // <-- added return
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(decoded);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Access denied. Invalid token." });
    // <-- added return
  }
};

module.exports = verifyToken;
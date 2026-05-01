const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("../config/runtime");

const authMiddleware = (req, res, next)=>{
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.status(401).json({message: "No Token provided"});
    }

    try {
        const token = authHeader.startsWith("Bearer ")
            ? authHeader.split(" ")[1]
            : authHeader;

        const decoded = jwt.verify(token, getJwtSecret());
        
        req.user = decoded;

        next();
    }
    catch(error){
        res.status(401).json({ message : "Invalid token"});

    }

}

module.exports = authMiddleware;


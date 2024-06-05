const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const secret = "secret"

hashPassword= async function(password) {
    const saltRounds = 5;
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    
    return {
        hash: hash
    };
}

function setUser(user){
  return jwt.sign({
    username:user.username,
    role:user.role
  },
  secret)
}
function getUser(token){
  if(!token) return null;
  try{
  return jwt.verify(token,secret);
  }catch(err){
    return null;
  }
}

async function access(req,res,next){
  token = req.cookies.uid;
  const user = getUser(token);
  if(token && (req.path == '/' || req.path == '/login' || req.path == '/admin/login')){
    return res.redirect('/home')
  } 
  else if (!token && (req.path == '/' || req.path == '/login' || req.path == '/admin/login')) {
    return next();
  }
  
  if(req.path!='/'){
    if(!token || !user) {
      return res.redirect('/login')
    }
  }
  

  req.user = user;
  next();
}

function isAdmin(req, res, next) {
  token = req.cookies.uid;
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: Token missing' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.role !== 'Admin') {
      console.log(decoded.role)
      return res.status(403).json({ message: 'Forbidden: Insufficient privileges' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
}



module.exports={
  isAdmin:isAdmin,
  hashPassword:hashPassword,
  setUser:setUser,
  getUser:getUser,
  access:access
}



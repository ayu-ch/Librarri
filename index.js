// require("dotenv").config();
const express = require('express');
const app = express()
const path = require('path')
const clientRouter = require("./routes/clientRouter")
const adminRouter = require("./routes/adminRouter")
const cookieParser = require("cookie-parser");
const {access} = require("./service/auth") 

const bodyParser = require("body-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());


app.get("/api",(req,res)=>{
  res.json({
    success:1,
    message:"This is rest api working"
  });
});

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"))

app.use("/",access,clientRouter)
app.use("/",access,adminRouter)



app.listen(3000,()=>{
  console.log("Server is up and running");
})
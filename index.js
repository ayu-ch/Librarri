// require("dotenv").config();
const express = require('express');
const app = express()
const path = require('path')
const staticRoute = require("./routes/staticRouter")
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

app.use("/",access,staticRoute)



app.listen(3000,()=>{
  console.log("Server is up and running");
})
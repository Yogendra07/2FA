const express = require("express");
const MongoClient  = require("mongodb").MongoClient;
const bcrypt = require("bcrypt");
const { body , validationResult } = require("express-validator");
const router = express.Router();
const db_url = "mongodb://localhost:27017";

router.get("/",isLoggedin,async(req,res)=>{
    let blogs = await listBlogs();
    res.render("index",{username : null , blogs : blogs });
})

router.get("/",async(req,res) => {
    let blogs = await listBlogs();
    res.render("index",{username : req.session.username ,blogs : blogs });
})
router.route("/register")
.get(isLoggedin,(req,res) =>
{
    res.render("register" , { errors : null});
})

.post([
    body("username").not().isEmpty().withMessage("Enter a valid Username!").escape(),
    body("email").not().isEmpty().withMessage("Enter a valid E-mail!")
            .isEmail().withMessage("Your E-mail is not valid").escape(),
    body("password").not().isEmpty().withMessage("Enter a valid password!") 
                .isLength({min : 8}).withMessage("The password must be atleast 8 characters long!"),
    body("confirm-password").custom((value,{ req}) => 
    {
        if(value !== req.body.password)
        {
            throw new Error("the password don't match");
        }
        return true;
        
    })

],async(req,res) =>
{
    const result = validationResult(req);
    if(!result.isEmpty())
    {
        return res.status(422).render("register",{errors : result.errors});
    }

    let client = await MongoClient.connect(db_url,{useUnifiedTopology : true});
    let found  = await userExists(client,req.body.username,req.body.email);

    if(found)
    {
        return res.render("register",{errors : [{msg : "The User already exsits"}]});

    }

    let hashPassword = await bcrypt.hash(req.body.password,10);
    await client.db("blog_system").collection("users").insertOne({
        username : req.body.username,
        email : req.body.email,
        password : hashPassword
    })

    client.close();
    res.redirect("/login");

    // MongoClient.connect(db_url,{useUnifiedTopology : true},(err,client) =>{

    //     if(err) throw new Error(err);

    //     bcrypt.hash(req.body.password,10,(err,encrypted) =>{
    //         client.db("blog_system").collection("users").findOne({
    //             $or : [
    //                 {username : req.body.username },
    //                 {email : req.body.email}
    //             ]
    //         },(err,found) => {
    //             if(found){
    //                 res.render("register",{ errors : [{msg : "The user already exsists"}]});
    //             }
    //             else{
    //                 client.db("blog_system").collection("users").insertOne({

    //                     username : req.body.username,
    //                     email : req.body.email,
    //                     password  : encrypted
    //                 },(err,result) => {
    //                     if(err) throw new Error(err);
    //                     client.close();
    //             });
    //         }
    
    //     });
     
    //     });
    // });

});

router.route("/login")
.get(isLoggedin,(req,res) => {

    res.render("login",{errors : null});
})

.post([
    body("username_email").not().isEmpty().withMessage("Enter a valid username or E-mail"),
    body("password").not().isEmpty().withMessage("Enter a valid password")

],async (req,res) => {

    let result = validationResult(req);
    if(!result.isEmpty())
    {
       return res.status(422).render("login",{errors : result.errors});
    }

    let client = await MongoClient.connect(db_url,{useUnifiedTopology : true});
    let user = await userExists(client,req.body.username_email,req.body.username_email);

    if(user)
    {
        if(await verifyPassword(req.body.password,user.password))
        {
            if(req.body.remember_me)
            {
                req.session.cookie.maxAge = 3600000; 
            }
           req.session.login = true;
           req.session.username = user.username;
           return res.redirect("/");
        }

    return res.render("login",{errors :[{msg : "Invalid Credentials!"}] });

    }

    return res.render("login",{errors :[{msg : "The user dosen't exist!"}] });
});

router.get("/logout",(req,res)=>{
    req.session.login = null;
    req.session.username = null;
    res.redirect("/login");
})
async function userExists(client,username,email)
{
    let user = await client.db("blog_system").collection("users").findOne({
        $or : [
            {username : username },
            {email : email}
        ]
    });

    if(user)
    {
        return user;
    }

    return false;
}

async function verifyPassword(password,hash)
{
    return await bcrypt.compare(password,hash);
}

function isLoggedin(req,res,next)
{
    if(req.session.login)
    {
        if(req.path !== "/")
        {
            return res.redirect("/");
        }

        return next("route");
    }
    next();
}

async function listBlogs(){

    let client = await MongoClient.connect(db_url,{useUnifiedTopology : true});
    let blogs = await client.db("blog_system").collection("blogs").find({},{title : 1 , description : 0}).toArray();

    if(blogs && blogs.length)
    {
        return blogs;
    }

    return false;
}
module.exports = router;
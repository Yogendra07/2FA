const router = require("express").Router();
const MongoClient = require("mongodb").MongoClient;
const {body , validationResult } = require("express-validator");
const db_url = "mongodb://localhost:27017";
const ObjectId = require("mongodb").ObjectId;


router.route("/create")
.get(isLoggedin,(req,res) => {
    res.render("blog/create", {errors : null });
})

.post([
    body("title").not().isEmpty().withMessage("Enter a valid title").escape(),
    body("description").not().isEmpty().withMessage("Enter a valid description!").escape()
],async(req,res) => {
    const result  = validationResult(req);
    if(!result.isEmpty())
    {
        return res.status(422).render("blog/create",{errors : result.errors});
    }
    // not needed
    let client = await MongoClient.connect(db_url,{useUnifiedTopology : true});
    let blog = await blogExists(client,req.body.title);

    if(blog)
    {
        return res.render("blog/create",{errors : [{msg : "The blog already exists!"}]});
    }

    await client.db("blog_system").collection("blogs").insertOne({
        title : req.body.title,
        description : req.body.description
    });
    
    client.close();
    res.redirect("/");
});

router.get("/:id",async (req,res)=>{
    let blog = await blogExistsById(req.params.id);
    if(blog)
    {
        return res.render("blog/view_blog",{blog : blog});
    }

    res.redirect("/");

})
// not needed
async function blogExists(client,title)
{
    let blog = await client.db("blog_system").collection("blogs").findOne({title : title});
    if(blog)
    {
        return true;
    }
    
    return false;
}
async function blogExistsById(id){
    let client = await MongoClient.connect(db_url,{useUnifiedTopology : true});
    let blog = await client.db("blog_system").collection("blogs").findOne({ _id : ObjectId(id)});
    if(blog)
    {
        return blog;
    }

    return false;
    
}

function isLoggedin(req,res,next)
{
    if(!req.session.login)
    {
        return res.redirect("/");
    }
    next();
}


module.exports = router;
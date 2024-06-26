import Mongo from './db.js'
import express from 'express'
import {ObjectId} from 'mongodb'
import cors from 'cors'
import bcrypt from 'bcrypt'
import https from 'node:https'
import fs from 'node:fs'
import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

const port = 8080

dotenv.config({path: "../public/.env"})
const secretkey = process.env.JWTSEC
/*
const key = fs.readFileSync("./privkey.pem");
const cert = fs.readFileSync("./fullchain.pem");
const options = {
    key: key,
    cert: cert
};
*/
const con = new Mongo()

const app = express()
app.use(express.json())
app.use(cors({
    origin: 'https://allchange.xyz' // TODO reset
}))

const RateLimitDefault = rateLimit({
    windowMs: 60 * 1000,  // 1-minute window
    max: 100,            // Limit each IP to 100 requests per windowMs
    message: { code: "429-1", msg: "Too many requests, please try again later." }
});

function Authorize(req,res,next) {
    if (!req.headers.authorization) {
        req.verified = false
        res.status(401)
        res.send(JSON.stringify({code: "401-1", msg: "Unauthorized"}))
    } else {
        const token = req.headers.authorization
        try {
            // Extract the JWT token from the header (remove "Bearer " prefix)
            const tokenData = token.replace('Bearer ', '');

            // Verify the token using your secret key
            jwt.verify(tokenData, secretkey, async (error, decoded) => {
                if (error) {
                    req.verified = false
                    res.status(401).json({code: "401-2", msg: 'Invalid token', error});
                    return
                }

                try {
                    // If the token is valid, you can access its payload in the `decoded` object
                    const user = await con.get("users", {username: decoded.user.username})
                    req.user = user[0];
                } catch(err) { console.log("Could not decode user object\nUser object is:",decoded.user) }
                req.verified = true
                next();
            })
        } catch (error) {
            req.verified = false
            res.status(500).json({code: "500-1", msg: 'Internal server error'});
        }
    }
}

// function AuthorizeApiKey(req,res,next) {
//     if (!req.headers.authorization) {
//         res.status(401)
//         res.send(JSON.stringify({code: "401-1", msg: "Unauthorized"}))
//         req.verified = false
//     } else {
//         if (req.headers.authorization === process.env.VITE_REACT_APP_API_KEY) {
//             req.verified = true
//             next()
//         } else {
//             res.status(401)
//             res.send(JSON.stringify({code: "401-4", msg: "Incorrect Master API Key on protected request"}))
//             req.verified = false
//         }
//     }
// }

app.use((req, res, next) => {
    console.log("LOGGING: " + req.path)
    next()
})

app.get('/api/dash', RateLimitDefault, Authorize, async (req,res) => {
    if (!req.verified) return
    const dash = (await con.get("dashboards", {username: req.user.username}))[0]
    res.send(dash)
})

app.post('/api/dash', RateLimitDefault, Authorize, async (req,res) => {
    if (!req.verified) return
    await con.post("dashboards", [{username: req.user.username, configuration: req.body.config}])
    res.send()
})

app.put('/api/dash', RateLimitDefault, Authorize, async (req,res) => {
    if (!req.verified) return
    await con.patch("dashboards",  {username: req.user.username}, {$set: {configuration: req.body.config}} )
    res.send()
})

app.get('/rpc/getUserStatus', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    const user = await con.get("users", {username: req.user.username})
    res.send({status: parseInt(user[0].perm) || 0})
})

app.get('/rpc/:id/thumbnail', Authorize, async (req, res) => {
    if (!req.verified) return
    let r = await fetch("https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds="+req.params.id+"&size=180x180&format=Png&isCircular=true")
    let re = await r.json()
    console.log(re)
    res.send({url: re.data[0].imageUrl})
})

app.post('/api/users', RateLimitDefault, async (req, res) => {
    if ((await con.get("users", {username: req.body.uname}))[0]) {
        res.status(400)
        res.send({code: "400-1", msg: "User already exists"})
        return
    }

    const salt = await bcrypt.genSalt(5);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    const output = {
        username: req.body.uname,
        password: hashedPassword,
        salt: salt,
        perm: 0
    }
    await con.post("users", [output])
    res.send()
})

app.post('/api/users/login', RateLimitDefault, async (req, res) => {
    const user = await con.get("users", {username: req.body.uname})
    if (!user[0]) {
        res.status(400)
        res.send({code: "400-2", msg: "Incorrect username"})
        return
    }
    const isPasswordValid = await bcrypt.compare(req.body.password, user[0].password);
    if (!isPasswordValid) {
        res.status(401)
        res.send({code: "401-3", msg: "Password auth failed"})
    } else {
        res.send({"token": jwt.sign({user: user[0]}, secretkey)})
    }
})
app.get('/rpc/getAllUsers', RateLimitDefault, Authorize, async (req,res) => {
    const users = await con.get("users", {})
    res.send(users)
})

app.get('/api/suggestions', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    let filter = {}
    if (req.query.user !== "1" && req.query.user) filter.authorId = new ObjectId(req.query.user)
    else if (req.query.user === "1") filter.authorId = new ObjectId(req.user._id)
    if (req.query.status) filter.status = parseInt(req.query.status)
    const data = await con.get("suggestions", filter)
    res.send(data)
})
app.post('/api/suggestions', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    const payload = {
        authorId: new ObjectId(req.user._id),
        status: 0,
        ...req.body
    }
    await con.post("suggestions", [payload])
    res.send()
})
app.post('/rpc/approve_suggestion', RateLimitDefault, Authorize, async (req, res) => {
    await con.patch("suggestions", {_id: new ObjectId(req.body.postid)}, {$set: {status: 1, comment: req.body.comment}})
    const n = await con.get("suggestions", {_id: new ObjectId(req.body.postid)})
    await con.post("notifs", [{user: n[0].authorId, ack: 0, title: "Suggestions", desc: `Your suggestion ${n[0].title} was approved and sent to developers. The comment was "${req.body.comment}"`}])
    res.send()
})
app.post('/rpc/deny_suggestion', RateLimitDefault, Authorize, async (req, res) => {
    await con.patch("suggestions", {_id: new ObjectId(req.body.postid)}, {$set: {status: 2, comment: req.body.comment}})
    const n = await con.get("suggestions", {_id: new ObjectId(req.body.postid)})
    await con.post("notifs", [{user: n[0].authorId, ack: 0, title: "Suggestions", desc: `Your suggestion ${n[0].title} was denied. The comment was "${req.body.comment}"`}])
    res.send()
})

app.get('/api/bugreports', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    let filter = {}
    if (req.query.user) filter.authorId = new ObjectId(req.query.user)
    if (req.query.status) filter.status = parseInt(req.query.status)
    const data = await con.get("bugreports", filter)
    res.send(data)
})
app.post('/api/bugreports', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    const payload = {
        authorId: new ObjectId(req.user._id),
        status: 0,
        ...req.body
    }
    await con.post("bugreports", [payload])
    res.send()
})
app.post('/rpc/approve_bugreport', RateLimitDefault, Authorize, async (req, res) => {
    await con.patch("bugreports", {_id: new ObjectId(req.body.postid)}, {$set: {status: 1, comment: req.body.comment}})
    const n = await con.get("bugreports", {_id: new ObjectId(req.body.postid)})
    await con.post("notifs", [{user: n[0].authorId, ack: 0, title: "Bug reports", desc: `Your bug report ${n[0].title} was approved and sent to developers. The comment was "${req.body.comment}"`}])
    res.send()
})
app.post('/rpc/deny_bugreport', RateLimitDefault, Authorize, async (req, res) => {
    await con.patch("bugreports", {_id: new ObjectId(req.body.postid)}, {$set: {status: 2, comment: req.body.comment}})
    const n = await con.get("bugreports", {_id: new ObjectId(req.body.postid)})
    await con.post("notifs", [{user: n[0].authorId, ack: 0, title: "Bug reports", desc: `Your bug report ${n[0].title} was denied. The comment was "${req.body.comment}"`}])
    res.send()
})

app.get('/api/tasks', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    let filter = {}
    if (req.query.assignee && req.query.assignee !== "1") filter.recipient = new ObjectId(req.query.assignee)
    else if (req.query.assignee === "1") filter.recipient = new ObjectId(req.user._id)
    if (req.query.taskid) filter.taskid = new ObjectId(req.query.taskid)
    if (req.query.status) filter.status = parseInt(req.query.status)
    const data = await con.get("tasks", filter)
    res.send(data)
})
app.post('/api/tasks', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    const payload = {
        setBy: new ObjectId(req.user._id),
        ...req.body,
    }
    await con.post("tasks", [payload])
    res.send()
})

app.get('/api/notifs', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    const notifs = await con.get("notifs", {user: new ObjectId(req.user._id), ack: 0})
    res.send(notifs)
})
app.post('/rpc/dismissNotif', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    await con.patch("notifs", {_id: new ObjectId(req.query.id)}, {$set: {ack: 1}})
    res.send()
})

app.post('/rpc/completeTask', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    await con.patch("tasks", {_id: new ObjectId(req.query.id)}, {$set: {status: 1}})
    res.send()
})

app.post('/rpc/assignTask', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return
    await con.patch("tasks", {_id: new ObjectId(req.body.id)}, {$set: {status: 1, info: req.body.info, recipient: new ObjectId(req.body.recipient), date: req.body.date}})
    const task = await con.get("tasks", {_id : new ObjectId(req.body.id)})
    await con.post("notifs", [{user: new ObjectId(req.body.recipient), ack: 0, title: "Developer Tasks", desc: `You have been set a new developer task with title ${task.title}. It is due ${req.body.date}. Go to your developer dashboard for more info.`}])
    res.send()
})

app.post('/rpc/resetPassword', RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return

    const isPasswordValid = await bcrypt.compare(req.body.old_password, req.user.password);

    if (!isPasswordValid) {
        res.status(401)
        res.send({error: true, msg: "Original password incorrect"})
        return
    }

    const salt = await bcrypt.genSalt(5);
    const hashedPassword = await bcrypt.hash(req.body.new_password, salt);
    const output = {
        password: hashedPassword,
        salt: salt
    }
    await con.patch("users", {username: req.user.username}, {$set: output})

    res.send({error: false})
})

app.get("/api/staff", RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return

    const staff = await con.get("staff", {})
    res.send(staff)
})
app.post("/api/staff", RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return

    await con.post("staff", req.body)
    res.send()
})
app.patch("/api/staff/:rblx", RateLimitDefault, Authorize, async (req, res) => {
    if (!req.verified) return

    await con.patch("staff", {rblx: req.params.rblx}, req.body)
    res.send()
})

// no ratelimit or auth
app.post('/oauth/token', async (req, res) => {
    console.log(req.query)

    let getToken = await fetch("https://apis.roblox.com/oauth/v1/token", {method: "POST", headers: {
        'content-type': "application/x-www-form-urlencoded",
        }, body: new URLSearchParams({
            "client_id": "3309736173071815916",
            "client_secret": process.env.CLIENT_SECRET,
            "code": req.query.code,
            "grant_type": "authorization_code"
        })})
    let access = await getToken.json()
    console.log(access)

    const uinfo = await fetch("https://apis.roblox.com/oauth/v1/userinfo", {headers: {
            Authorization: 'Bearer '+access.access_token
    }})

    const data = await uinfo.json()

    if (data.error) {
        res.status(400)
        res.send(data)
        return
    }

    const uname = data.preferred_username
    console.log(data)
    console.log("code: "+'Bearer '+req.query.code)

    let user = (await con.get("users", {username: uname}))[0]
    console.log(user)

    if (user && user.oauth) {
        res.send({token: jwt.sign({user: user}, secretkey), access_token: req.query.code})
        return
    }

    const output = {
        username: uname,
        oauth: true,
        access_token: access.access_token,
        refresh_token: access.refresh_token,
        perm: 0,
        "_id": req.query.sub
    }


    await con.post("users", [output])
    user = (await con.get("users", {username: output.username}))[0]

    res.send({access_token: req.query.code, token: jwt.sign({user: user}, secretkey)})
})

//const server = https.createServer(options, app);

//server.listen(port, () => {
app.listen(port, () => {
    console.log("server starting on port : " + port)
});


import * as path from 'path';
import express from 'express';
import mysql from 'mysql2/promise';

import dayjs from 'dayjs';

import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import cors from 'cors';
const app = express();
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
};
const allowedOrigins = [
    'http://localhost:4200', 
    'https://todotify-912e9.web.app' 
];

app.use(
    cors({
        origin: function (origin, callback) {
            
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    })
);
app.use(express.json());

import sendOTPMail from './mail.js';
import { otpVerify } from './otpauth.js';

function tokenGenerator() {
    const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 30; i++) {
        id += keys.charAt(Math.floor(Math.random() * keys.length));
    }

    checkUsername().then((res)=>{
        if(res.length == 0){
            return id
        }else{
            tokenGenerator()
        }
    })
    
    return id;
}

const checkUsername = async (id)=> {
    const sqlsearch = 'SELECT * FROM users WHERE username = ? ';
    const query = pool.format(sqlsearch, [id]);
    const [user] = await pool.execute(query);

    return user
}
const pool = mysql.createPool(dbConfig);

app.get('/users', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM users');
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching users:', error);

        res.status(500).send('Error fetching users from the database');
    }
});

app.post('/login', async (req, res) => {
    try {
        const sqlsearch = 'SELECT * FROM users WHERE email = ? ';
        const query = pool.format(sqlsearch, [req.body.email]);
        const [user] = await pool.execute(query);
        console.log(user);
        if (user.length == 0) {
            res.json({ status_code: 404, user });
            return;
        }

        const userDetail = user[0];
        if (req.body.password != userDetail['passx']) {
            res.json({ status_code: 401 });
            return;
        }
        let data = {
            username: userDetail['username'],
            fullname: userDetail['fullname'],
            email: req.body.email
        };

        let jwtSecretKey = process.env.JWT_SECRET_KEY;

        const options = {
            expiresIn: '5h',
            issuer: 'Shivansh Goel',
            subject: 'Auth Token - Todotify',
            audience: userDetail['fullname'],
            header: { alg: 'HS256' }
        };
        const token = jwt.sign(data, jwtSecretKey, options);
        const sqlInsert = 'UPDATE users SET sessionKey = ?';

        const update_query = mysql.format(sqlInsert, [token]);

        const response = await pool.execute(update_query);

        if (!response) res.json({ status_code: 500 });

        let mailRes = await sendOTPMail(req.body.email);

        if (mailRes == 'Code Sent') {
            console.log('OTP sent successfully');
            res.json({ status_code: 200, response, mailRes });
        } else {
            console.error('Failed to send OTP');
            res.json({ status_code: 500, mailRes });
        }
    } catch (error) {
        console.error('Error fetching users:', error);

        res.status(500).send('Error fetching users from the database');
    }
});

app.get('/', (req, res) => {
    const name = 'World';
    res.send(`Hello ${name}!`);
});

app.post('/createUser', async (req, res) => {
    try {
        const sqlsearch = 'SELECT * FROM users WHERE email = ? ';
        console.log("SELECT * FROM users WHERE email = '" + req.body.email + "'");
        const query = pool.format(sqlsearch, [req.body.email]);
        const [user] = await pool.execute(query);
        let username = tokenGenerator();

        if (user.length > 0) {
            res.json({ status_code: 400, user });
        } else {
            let jwtSecretKey = process.env.JWT_SECRET_KEY;

            let data = {
                username: username,
                fullname: req.body.fullname,
                email: req.body.email
            };

            const options = {
                expiresIn: '5h',
                issuer: 'Shivansh Goel',
                subject: 'Auth Token - Todotify',
                audience: req.body.fullname,
                header: { alg: 'HS256' }
            };

            const token = jwt.sign(data, jwtSecretKey, options);
            const sqlInsert = 'INSERT INTO users VALUES (0,?,?,?,?,?)';

            const insert_query = mysql.format(sqlInsert, [username, req.body.email, req.body.password, req.body.fullname, token]);

            const response = await pool.execute(insert_query);

            let mailRes = await sendOTPMail(req.body.email);

            if (mailRes == 'Code Sent') {
                console.log('OTP sent successfully');
                res.json({ status_code: 200, response });
            } else {
                console.error('Failed to send OTP');
                res.json({ status_code: 500, mailRes });
            }
        }
    } catch (error) {
        console.error('Error fetching users:', error);

        res.status(500).send('Error fetching users from the database');
    }
});

app.post('/validateOTP', async (req, res) => {
    try {
        const otp = req.body.otp;
        const mail = req.body.mail;
        const valid = await otpVerify(mail, otp);
        console.log(valid);

        if (valid == 200) {
            const sqlsearch = 'SELECT * FROM users WHERE email = ? ';
            const query = pool.format(sqlsearch, [req.body.mail]);
            const [user] = await pool.execute(query);
            const token = user[0]['sessionKey'];
            res.json({ status_code: 200, token });
        } else if (valid == 300) {
            res.json({ status_code: 300, deatil: 'Otp Expired' });
        } else if (valid == 404) {
            res.json({ status_code: 404, detail: 'Invalid Token' });
        } else {
            res.json({ status_code: 500, detail: 'Something went wrong' });
        }
    } catch (error) {
        console.error('Error fetching users:', error);

        res.status(500).send('Error fetching users from the database');
    }
});

app.get('/checkUsers', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM users');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching users:', error);

        res.status(500).send('Error fetching users from the database');
    }
});

app.post('/todo_count', async (req, res) => {
    const token = req.body.token;
    if (token == '') {
        res.json({ status_code: 401 });
        return;
    }

    let decoded_payload = jwt.decode(token, { complete: true });

    if (Math.floor(new Date().getTime() / 1000.0) - decoded_payload['payload']['exp'] > 0) {
        res.json({ status_code: 401 });
        return;
    }
    const email = decoded_payload['payload']['email'];
    const username = decoded_payload['payload']['username'];
    const sqlsearch = 'SELECT * FROM users_todo_counts WHERE email = ? and username = ? ';
    const query = pool.format(sqlsearch, [email, username]);
    const [todo_counts] = await pool.execute(query);

    if (todo_counts.length == 0) {
        res.json({ status_code: 404 });
        return;
    }
    let todos = todo_counts[0];
    res.json({ status_code: 200, todo_counts: todos });
});
const port = 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});

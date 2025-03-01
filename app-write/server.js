import * as path from 'path';
import express from 'express';
import mysql from 'mysql2/promise';
import dayjs from 'dayjs';
import { sendOTPMail } from './mail.js';
import { otpVerify } from './otpauth.js';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });
import cors from 'cors';
const app = express();
app.use(cors({}));

app.use(express.json());

import { Client, Databases, ID } from 'appwrite';

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
};

const client = new Client();
client.setProject('67c1a181001d59b9b905');
const databases = new Databases(client);

function tokenGenerator() {
    const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 12; i++) {
        id += keys.charAt(Math.floor(Math.random() * keys.length));
    }
    return id;
}
const pool = mysql.createPool(dbConfig);

app.get('/users', async (req, res) => {
    try {
        const users = await databases.listDocuments('67c1a6bd002e5595785c', '67c1a6c5001e5180b0c6');
        res.json(users.documents);
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
                expiresIn: '1h',
                issuer: 'Shivansh Goel',
                subject: 'Auth Token - Todotify',
                audience: req.body.fullname,
                header: { alg: 'HS256' }
            };

            const token = jwt.sign(data, jwtSecretKey, options);
            const sqlInsert = 'INSERT INTO users VALUES (0,?,?,?,?,?)';

            const insert_query = mysql.format(sqlInsert, [username, req.body.email, req.body.fullname, req.body.password, token]);

            const response = await pool.execute(insert_query);

            let mailRes = await sendOTPMail(req.body.email);
            console.log(req.body);

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

app.post('todo_count', async (req, res) => {
    const email = req.body.email;
    const username = req.body.username;
});

export default app;

// If server.js is in the same directory as the script you're running:
// const serverPath = path.join(__dirname, 'server.js');
// require(serverPath);

import { TOTP } from "totp-generator"
import * as dotenv from 'dotenv'
dotenv.config({ path: '../../.env' });
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
  };
  
const pool = mysql.createPool(dbConfig);
import dayjs from 'dayjs'
import * as mysql from 'mysql2/promise'

export const otpGenerator = (email) => {

    const { otp } = TOTP.generate("JBSWY3DPEHPK3PXP", { digits: 4 })
    saveToDB(email,otp);

    return otp ;

}


const saveToDB=async(email,otp)=>{
    const sqlInsert = "INSERT INTO OTP_DIRECTORY VALUES (0,?,?,?)";
      
    const insert_query = mysql.format(sqlInsert, [
                email,
                otp,
                Math.floor(new Date().getTime()/1000.0) ]);

                
    const response = await pool.execute(insert_query)
}

export const otpVerify=(mail,otp)=>{
    return new Promise((resolve, reject) => {
        let response
    getFromDB(mail).then((res)=>{
        console.log(res)
        let dbmail  = res[0][0]['EMAIL']
    let dbotp  = res[0][0]['OTP']
    let time  = res[0][0]['CreatedAt']
    console.log("otp" + dbotp)
    if(dbotp){
        if (dbotp == otp){
            if(time - Math.floor(new Date().getTime()/1000.0) < 180){
                resolve(200)
            }else {
                resolve(300)
            }
        }else{
            resolve(404)
        }
    }else{
        console.log()
        reject("Error")
    }
    })
    })
    
    
}

const getFromDB=async(email)=>{
    const sqlInsert = 'SELECT * FROM OTP_DIRECTORY where EMAIL = ? ';

    const insert_query = mysql.format(sqlInsert, [
        email]);

    return await pool.execute(insert_query)
}




let IS_PROD = true;
const server = IS_PROD ?
    "https://apnavideocallbackend-7882.onrender.com" :
    
    "http://localhost:8000";
    

export default server;
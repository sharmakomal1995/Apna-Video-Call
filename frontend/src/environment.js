let IS_PROD = true;
const server = IS_PROD ?
    "https://apna-video-call-qzpd.onrender.com" :
    
    "http://localhost:8000";
    

export default server;
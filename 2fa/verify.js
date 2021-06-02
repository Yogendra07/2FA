const speakeasy = require('speakeasy');

 var verified = speakeasy.totp.verify({
    secret : 'emZhxr>sQ97*qI9wX>?4TM*N%/pCV93M',
    encoding : 'ascii',
    token : '212536'
})

console.log(verified)
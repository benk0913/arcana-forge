const path=require('node:path');const fs=require('node:fs');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
function serve(req,res,root){
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method Not Allowed');return;}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Invalid URL');return;}
 if(pathname==='/'||pathname==='')pathname='/index.html';
 const full=path.resolve(root,'.'+pathname);if(!full.startsWith(path.resolve(root)+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
 if(pathname.split('/').some(part=>part.startsWith('.')&&part.length>1)){res.writeHead(403);res.end('Forbidden');return;}
 fs.stat(full,(err,info)=>{if(err||!info.isFile()){res.writeHead(404,{'Content-Type':'text/plain'});res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':TYPES[path.extname(full)]||'application/octet-stream','Content-Length':info.size,'X-Content-Type-Options':'nosniff','Cache-Control':pathname==='/index.html'?'no-store':'public, max-age=300'});
 if(req.method==='HEAD'){res.end();return;}fs.createReadStream(full).pipe(res);
 });
}
module.exports={serve};

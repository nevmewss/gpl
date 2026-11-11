import { createError, getHeader } from 'h3';
export async function assertBodySize(event, limit) {
  if(Number(getHeader(event,'content-length')||0)>limit) throw createError({statusCode:413,statusMessage:'Payload too large'});
  const req=event.node.req;
  if(Buffer.isBuffer(req.rawBody)) {if(req.rawBody.length>limit)throw createError({statusCode:413});return}
  req.rawBody=await new Promise((resolve,reject)=>{
    const chunks=[];let size=0,failed=false;
    req.on('data',chunk=>{size+=chunk.length;if(size>limit){if(!failed){failed=true;chunks.length=0;reject(createError({statusCode:413,statusMessage:'Payload too large'}))}return}if(!failed)chunks.push(Buffer.from(chunk))});
    req.on('end',()=>{if(!failed)resolve(Buffer.concat(chunks))});
    req.on('error',reject);
  });
}

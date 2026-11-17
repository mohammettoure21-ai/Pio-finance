import {createProxy} from '../server/vercel-proxy.mjs';

export const config = {maxDuration: 30};

// Vercel rewrites the URL before invoking a native function. Carry only the
// captured route, never a destination URL, and retain the proxy's whitelist.
export function createRoutedProxy(options) {
 const proxy=createProxy(options);
 return (req,res)=>{
  const raw=typeof req.url==='string'?req.url:'';
  const base=raw.split('?')[0];
  let params=new URLSearchParams(raw.includes('?')?raw.slice(raw.indexOf('?')+1):'');
  if(!params.size && req.query && Object.keys(req.query).length) {
   if(Object.keys(req.query).every(k=>['__pio_path','path'].includes(k)) && typeof req.query.__pio_path==='string' && (!Object.hasOwn(req.query,'path')||typeof req.query.path==='string'))params=new URLSearchParams(req.query);
   else req.url='/invalid-pio-route';
  }
  if(base==='/api/pio-proxy' || params.has('__pio_path')) {
   const route=params.get('__pio_path');
   // Vercel can retain the source capture as `path`; accept it only when it
   // exactly duplicates our explicit route, never as an alternative destination.
   const valid=[...params.keys()].every(k=>['__pio_path','path'].includes(k)) && params.getAll('__pio_path').length===1 && params.getAll('path').length<=1 && (!params.has('path')||params.get('path')===route) && typeof route==='string' && /^[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*$/.test(route);
   const target=valid?'/api/pio/'+route:null;
   req.url=target && (base==='/api/pio-proxy'||base===target)?target:'/invalid-pio-route';
  }
  return proxy(req,res);
 };
}

export default createRoutedProxy();

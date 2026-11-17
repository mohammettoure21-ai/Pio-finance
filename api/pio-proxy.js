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
  if(!params.size && req.query && Object.keys(req.query).length===1 && typeof req.query.__pio_path==='string')params=new URLSearchParams({__pio_path:req.query.__pio_path});
  if(base==='/api/pio-proxy' || params.has('__pio_path')) {
   const route=params.get('__pio_path');
   const valid=params.size===1 && params.getAll('__pio_path').length===1 && typeof route==='string' && /^[A-Za-z0-9-]+(?:\/[A-Za-z0-9-]+)*$/.test(route);
   const target=valid?'/api/pio/'+route:null;
   req.url=target && (base==='/api/pio-proxy'||base===target)?target:'/invalid-pio-route';
  }
  return proxy(req,res);
 };
}

export default createRoutedProxy();

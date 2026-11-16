import {defineConfig} from 'vite';
export default defineConfig(({command,isPreview})=> {
 const port=process.env.PIO_DEV_API_PORT||'8787';
 if(!/^\d{1,5}$/.test(port)||Number(port)<1||Number(port)>65535)throw new Error('Invalid PIO_DEV_API_PORT');
 return {
  server:{host:'127.0.0.1',strictPort:true,...command==='serve'&&!isPreview&&{proxy:{'/api/pio':{target:`http://127.0.0.1:${port}`,changeOrigin:true}}}},
  preview:{host:'127.0.0.1',strictPort:true},
 };
});

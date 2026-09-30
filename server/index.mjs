import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const API_KEY = process.env.OPENAI_API_KEY;
const SYSTEM_PROMPT = `Eres EnergIA, asistente de Buena Energía Marketing Digital. Ayudas a crear contenido, ideas, guiones para Reels, respuestas a clientes y estrategias sencillas. Responde principalmente en español, con tono cercano, profesional y natural. No inventes precios, descuentos, testimonios ni resultados garantizados. Cuando falte información comercial esencial, dilo con claridad.`;

function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'});res.end(JSON.stringify(payload));}
async function body(req){let raw='';for await(const c of req){raw+=c;if(raw.length>1_000_000)throw new Error('Solicitud demasiado grande');}return raw?JSON.parse(raw):{};}
function extractText(data){if(typeof data.output_text==='string')return data.output_text;for(const item of data.output||[]){for(const c of item.content||[]){if(c.type==='output_text'&&typeof c.text==='string')return c.text;}}return '';}
const server=http.createServer(async(req,res)=>{
 if(req.method==='OPTIONS')return json(res,204,{});
 if(req.method==='GET'&&req.url==='/health')return json(res,200,{ok:true,service:'energia-server',model:MODEL});
 if(req.method==='POST'&&req.url==='/chat'){
   if(!API_KEY)return json(res,503,{error:'Falta OPENAI_API_KEY en el servidor.'});
   try{
     const data=await body(req);const messages=(Array.isArray(data.messages)?data.messages:[]).filter(m=>m&&(m.role==='user'||m.role==='assistant')&&typeof m.content==='string').slice(-20);
     if(!messages.length)return json(res,400,{error:'Envía al menos un mensaje.'});
     const input=messages.map(m=>({role:m.role,content:[{type:'input_text',text:m.content}]}));
     const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,instructions:SYSTEM_PROMPT,input})});
     const out=await r.json();if(!r.ok)return json(res,r.status,{error:out?.error?.message||'Error en OpenAI'});
     return json(res,200,{text:extractText(out)||'No pude generar una respuesta.'});
   }catch(e){return json(res,500,{error:e instanceof Error?e.message:'Error interno'});}
 }
 return json(res,404,{error:'Ruta no encontrada'});
});
server.listen(PORT,'0.0.0.0',()=>console.log(`EnergIA API lista en http://0.0.0.0:${PORT}`));
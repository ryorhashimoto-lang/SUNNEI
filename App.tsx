scheduling build on Metal builder "builder-ghbwps"
scheduling build on Metal builder "builder-ghbwps"
[snapshot] received sha256:d713d1a527b8444724fe7efd7961da8332f26fbf6c9624e39d84f683fb93085e md5:308152aa48a0c63b6db2d0808d0a1760
receiving snapshot
31.4 KB
836ms
analyzing snapshot
31.4 KB
2ms
uploading snapshot
31.4 KB
19ms
fetched snapshot sha256:d713d1a527b8444724fe7efd7961da8332f26fbf6c9624e39d84f683fb93085e (32 kB bytes)
fetching snapshot
31.4 KB
165ms
unpacking archive
130 KB
3ms
using build driver railpack-v0.17.2
 INFO No package manager inferred, using npm default
                   
╭─────────────────╮
│ Railpack 0.17.2 │
╰─────────────────╯
 
  ↳ Detected Node
  ↳ Using npm package manager
            
  Packages  
  ──────────
  node  │  22.22.0  │  railpack default (22)
            
  Steps     
  ──────────
  ▸ install
    $ npm install
         
  ▸ build
    $ npm run build
            
  Deploy    
  ──────────
    $ npm run start
 

load build definition from ./railpack-plan.json
0ms

install mise packages: node cached
0ms

copy package.json cached
0ms

mkdir -p /app/node_modules/.cache cached
0ms

npm install cached
0ms

copy / /app, .
277ms

npm run build
2s
npm warn config production Use `--omit=dev` instead.
> shunnei-memorial-photo-tool@1.0.0 build
> tsc && vite build
services/geminiService.ts(40,7): error TS2451: Cannot redeclare block-scoped variable 'backgroundPrompt'.

services/geminiService.ts(41,7): error TS2451: Cannot redeclare block-scoped variable 'backgroundPrompt'.

Build Failed: build daemon returned an error < failed to solve: process "sh -c npm run build" did not complete successfully: exit code: 2 >

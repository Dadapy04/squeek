import{l as e,u as t}from"./lit-BUxpUABm.js";var n=Symbol(),r=Object.getPrototypeOf,i=new WeakMap,a=e=>e&&(i.has(e)?i.get(e):r(e)===Object.prototype||r(e)===Array.prototype),o=e=>a(e)&&e[n]||null,s=(e,t=!0)=>{i.set(e,t)},c=e=>typeof e==`object`&&!!e,l=new WeakMap,u=new WeakSet,[d]=((e=Object.is,t=(e,t)=>new Proxy(e,t),n=e=>c(e)&&!u.has(e)&&(Array.isArray(e)||!(Symbol.iterator in e))&&!(e instanceof WeakMap)&&!(e instanceof WeakSet)&&!(e instanceof Error)&&!(e instanceof Number)&&!(e instanceof Date)&&!(e instanceof String)&&!(e instanceof RegExp)&&!(e instanceof ArrayBuffer),r=e=>{switch(e.status){case`fulfilled`:return e.value;case`rejected`:throw e.reason;default:throw e}},i=new WeakMap,a=(e,t,n=r)=>{let o=i.get(e);if(o?.[0]===t)return o[1];let c=Array.isArray(e)?[]:Object.create(Object.getPrototypeOf(e));return s(c,!0),i.set(e,[t,c]),Reflect.ownKeys(e).forEach(t=>{if(Object.getOwnPropertyDescriptor(c,t))return;let r=Reflect.get(e,t),{enumerable:i}=Reflect.getOwnPropertyDescriptor(e,t),o={value:r,enumerable:i,configurable:!0};if(u.has(r))s(r,!1);else if(r instanceof Promise)delete o.value,o.get=()=>n(r);else if(l.has(r)){let[e,t]=l.get(r);o.value=a(e,t(),n)}Object.defineProperty(c,t,o)}),Object.preventExtensions(c)},d=new WeakMap,f=[1,1],p=r=>{if(!c(r))throw Error(`object required`);let i=d.get(r);if(i)return i;let s=f[0],m=new Set,h=(e,t=++f[0])=>{s!==t&&(s=t,m.forEach(n=>n(e,t)))},g=f[1],ee=(e=++f[1])=>(g!==e&&!m.size&&(g=e,v.forEach(([t])=>{let n=t[1](e);n>s&&(s=n)})),s),_=e=>(t,n)=>{let r=[...t];r[1]=[e,...r[1]],h(r,n)},v=new Map,te=(e,t)=>{if(m.size){let n=t[3](_(e));v.set(e,[t,n])}else v.set(e,[t])},ne=e=>{var t;let n=v.get(e);n&&(v.delete(e),(t=n[1])==null||t.call(n))},re=e=>(m.add(e),m.size===1&&v.forEach(([e,t],n)=>{let r=e[3](_(n));v.set(n,[e,r])}),()=>{m.delete(e),m.size===0&&v.forEach(([e,t],n)=>{t&&(t(),v.set(n,[e]))})}),ie=Array.isArray(r)?[]:Object.create(Object.getPrototypeOf(r)),ae=t(ie,{deleteProperty(e,t){let n=Reflect.get(e,t);ne(t);let r=Reflect.deleteProperty(e,t);return r&&h([`delete`,[t],n]),r},set(t,r,i,a){let s=Reflect.has(t,r),f=Reflect.get(t,r,a);if(s&&(e(f,i)||d.has(i)&&e(f,d.get(i))))return!0;ne(r),c(i)&&(i=o(i)||i);let m=i;if(i instanceof Promise)i.then(e=>{i.status=`fulfilled`,i.value=e,h([`resolve`,[r],e])}).catch(e=>{i.status=`rejected`,i.reason=e,h([`reject`,[r],e])});else{!l.has(i)&&n(i)&&(m=p(i));let e=!u.has(m)&&l.get(m);e&&te(r,e)}return Reflect.set(t,r,m,a),h([`set`,[r],i,f]),!0}});d.set(r,ae);let oe=[ie,ee,a,re];return l.set(ae,oe),Reflect.ownKeys(r).forEach(e=>{let t=Object.getOwnPropertyDescriptor(r,e);`value`in t&&(ae[e]=r[e],delete t.value,delete t.writable),Object.defineProperty(ie,e,t)}),ae})=>[p,l,u,e,t,n,r,i,a,d,f])();function f(e={}){return d(e)}function p(e,t,n){let r=l.get(e),i,a=[],o=r[3],s=!1,c=o(e=>{a.push(e),n?t(a.splice(0)):i||=Promise.resolve().then(()=>{i=void 0,s&&t(a.splice(0))})});return s=!0,()=>{s=!1,c()}}function m(e,t){let[n,r,i]=l.get(e);return i(n,r(),t)}function h(e){return u.add(e),e}function g(e,t,n,r){let i=e[t];return p(e,()=>{let r=e[t];Object.is(i,r)||n(i=r)},r)}function ee(e){let t=f({data:Array.from(e||[]),has(e){return this.data.some(t=>t[0]===e)},set(e,t){let n=this.data.find(t=>t[0]===e);return n?n[1]=t:this.data.push([e,t]),this},get(e){return this.data.find(t=>t[0]===e)?.[1]},delete(e){let t=this.data.findIndex(t=>t[0]===e);return t!==-1&&(this.data.splice(t,1),!0)},clear(){this.data.splice(0)},get size(){return this.data.length},toJSON(){return new Map(this.data)},forEach(e){this.data.forEach(t=>{e(t[1],t[0],this)})},keys(){return this.data.map(e=>e[0]).values()},values(){return this.data.map(e=>e[1]).values()},entries(){return new Map(this.data).entries()},get[Symbol.toStringTag](){return`Map`},[Symbol.iterator](){return this.entries()}});return Object.defineProperties(t,{data:{enumerable:!1},size:{enumerable:!1},toJSON:{enumerable:!1}}),Object.seal(t),t}var _={WC_NAME_SUFFIX:`.reown.id`,WC_NAME_SUFFIX_LEGACY:`.wcn.id`,BLOCKCHAIN_API_RPC_URL:`https://rpc.walletconnect.org`,PULSE_API_URL:`https://pulse.walletconnect.org`,W3M_API_URL:`https://api.web3modal.org`,CONNECTOR_ID:{WALLET_CONNECT:`walletConnect`,INJECTED:`injected`,WALLET_STANDARD:`announced`,COINBASE:`coinbaseWallet`,COINBASE_SDK:`coinbaseWalletSDK`,SAFE:`safe`,LEDGER:`ledger`,OKX:`okx`,EIP6963:`eip6963`,AUTH:`ID_AUTH`},CONNECTOR_NAMES:{AUTH:`Auth`},AUTH_CONNECTOR_SUPPORTED_CHAINS:[`eip155`,`solana`],LIMITS:{PENDING_TRANSACTIONS:99},CHAIN:{EVM:`eip155`,SOLANA:`solana`,POLKADOT:`polkadot`,BITCOIN:`bip122`},CHAIN_NAME_MAP:{eip155:`EVM Networks`,solana:`Solana`,polkadot:`Polkadot`,bip122:`Bitcoin`,cosmos:`Cosmos`},ADAPTER_TYPES:{BITCOIN:`bitcoin`,SOLANA:`solana`,WAGMI:`wagmi`,ETHERS:`ethers`,ETHERS5:`ethers5`},USDT_CONTRACT_ADDRESSES:[`0xdac17f958d2ee523a2206206994597c13d831ec7`,`0xc2132d05d31c914a87c6611c10748aeb04b58e8f`,`0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7`,`0x919C1c267BC06a7039e03fcc2eF738525769109c`,`0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e`,`0x55d398326f99059fF775485246999027B3197955`,`0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9`],HTTP_STATUS_CODES:{SERVICE_UNAVAILABLE:503,FORBIDDEN:403},UNSUPPORTED_NETWORK_NAME:`Unknown Network`,SECURE_SITE_SDK_ORIGIN:(typeof process<`u`?{}.NEXT_PUBLIC_SECURE_SITE_ORIGIN:void 0)||`https://secure.walletconnect.org`},v={caipNetworkIdToNumber(e){return e?Number(e.split(`:`)[1]):void 0},parseEvmChainId(e){return typeof e==`string`?this.caipNetworkIdToNumber(e):e},getNetworksByNamespace(e,t){return e?.filter(e=>e.chainNamespace===t)||[]},getFirstNetworkByNamespace(e,t){return this.getNetworksByNamespace(e,t)[0]},getNetworkNameByCaipNetworkId(e,t){if(!t)return;let n=e.find(e=>e.caipNetworkId===t);if(n)return n.name;let[r]=t.split(`:`);return _.CHAIN_NAME_MAP?.[r]||void 0}},te=20,ne=1,re=1e6,ie=1e6,ae=-7,oe=21,se=!1,ce=`[big.js] `,le=ce+`Invalid `,ue=le+`decimal places`,de=le+`rounding mode`,fe=ce+`Division by zero`,y={},b=void 0,pe=/^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;function me(){function e(t){var n=this;if(!(n instanceof e))return t===b?me():new e(t);if(t instanceof e)n.s=t.s,n.e=t.e,n.c=t.c.slice();else{if(typeof t!=`string`){if(e.strict===!0&&typeof t!=`bigint`)throw TypeError(le+`value`);t=t===0&&1/t<0?`-0`:String(t)}he(n,t)}n.constructor=e}return e.prototype=y,e.DP=te,e.RM=ne,e.NE=ae,e.PE=oe,e.strict=se,e.roundDown=0,e.roundHalfUp=1,e.roundHalfEven=2,e.roundUp=3,e}function he(e,t){var n,r,i;if(!pe.test(t))throw Error(le+`number`);for(e.s=t.charAt(0)==`-`?(t=t.slice(1),-1):1,(n=t.indexOf(`.`))>-1&&(t=t.replace(`.`,``)),(r=t.search(/e/i))>0?(n<0&&(n=r),n+=+t.slice(r+1),t=t.substring(0,r)):n<0&&(n=t.length),i=t.length,r=0;r<i&&t.charAt(r)==`0`;)++r;if(r==i)e.c=[e.e=0];else{for(;i>0&&t.charAt(--i)==`0`;);for(e.e=n-r-1,e.c=[],n=0;r<=i;)e.c[n++]=+t.charAt(r++)}return e}function ge(e,t,n,r){var i=e.c;if(n===b&&(n=e.constructor.RM),n!==0&&n!==1&&n!==2&&n!==3)throw Error(de);if(t<1)r=n===3&&(r||!!i[0])||t===0&&(n===1&&i[0]>=5||n===2&&(i[0]>5||i[0]===5&&(r||i[1]!==b))),i.length=1,r?(e.e=e.e-t+1,i[0]=1):i[0]=e.e=0;else if(t<i.length){if(r=n===1&&i[t]>=5||n===2&&(i[t]>5||i[t]===5&&(r||i[t+1]!==b||i[t-1]&1))||n===3&&(r||!!i[0]),i.length=t,r){for(;++i[--t]>9;)if(i[t]=0,t===0){++e.e,i.unshift(1);break}}for(t=i.length;!i[--t];)i.pop()}return e}function _e(e,t,n){var r=e.e,i=e.c.join(``),a=i.length;if(t)i=i.charAt(0)+(a>1?`.`+i.slice(1):``)+(r<0?`e`:`e+`)+r;else if(r<0){for(;++r;)i=`0`+i;i=`0.`+i}else if(r>0){if(++r>a)for(r-=a;r--;)i+=`0`;else r<a&&(i=i.slice(0,r)+`.`+i.slice(r))}else a>1&&(i=i.charAt(0)+`.`+i.slice(1));return e.s<0&&n?`-`+i:i}y.abs=function(){var e=new this.constructor(this);return e.s=1,e},y.cmp=function(e){var t,n=this,r=n.c,i=(e=new n.constructor(e)).c,a=n.s,o=e.s,s=n.e,c=e.e;if(!r[0]||!i[0])return r[0]?a:i[0]?-o:0;if(a!=o)return a;if(t=a<0,s!=c)return s>c^t?1:-1;for(o=(s=r.length)<(c=i.length)?s:c,a=-1;++a<o;)if(r[a]!=i[a])return r[a]>i[a]^t?1:-1;return s==c?0:s>c^t?1:-1},y.div=function(e){var t=this,n=t.constructor,r=t.c,i=(e=new n(e)).c,a=t.s==e.s?1:-1,o=n.DP;if(o!==~~o||o<0||o>re)throw Error(ue);if(!i[0])throw Error(fe);if(!r[0])return e.s=a,e.c=[e.e=0],e;var s,c,l,u,d,f=i.slice(),p=s=i.length,m=r.length,h=r.slice(0,s),g=h.length,ee=e,_=ee.c=[],v=0,te=o+(ee.e=t.e-e.e)+1;for(ee.s=a,a=te<0?0:te,f.unshift(0);g++<s;)h.push(0);do{for(l=0;l<10;l++){if(s!=(g=h.length))u=s>g?1:-1;else for(d=-1,u=0;++d<s;)if(i[d]!=h[d]){u=i[d]>h[d]?1:-1;break}if(u<0){for(c=g==s?i:f;g;){if(h[--g]<c[g]){for(d=g;d&&!h[--d];)h[d]=9;--h[d],h[g]+=10}h[g]-=c[g]}for(;!h[0];)h.shift()}else break}_[v++]=u?l:++l,h[0]&&u?h[g]=r[p]||0:h=[r[p]]}while((p++<m||h[0]!==b)&&a--);return!_[0]&&v!=1&&(_.shift(),ee.e--,te--),v>te&&ge(ee,te,n.RM,h[0]!==b),ee},y.eq=function(e){return this.cmp(e)===0},y.gt=function(e){return this.cmp(e)>0},y.gte=function(e){return this.cmp(e)>-1},y.lt=function(e){return this.cmp(e)<0},y.lte=function(e){return this.cmp(e)<1},y.minus=y.sub=function(e){var t,n,r,i,a=this,o=a.constructor,s=a.s,c=(e=new o(e)).s;if(s!=c)return e.s=-c,a.plus(e);var l=a.c.slice(),u=a.e,d=e.c,f=e.e;if(!l[0]||!d[0])return d[0]?e.s=-c:l[0]?e=new o(a):e.s=1,e;if(s=u-f){for((i=s<0)?(s=-s,r=l):(f=u,r=d),r.reverse(),c=s;c--;)r.push(0);r.reverse()}else for(n=((i=l.length<d.length)?l:d).length,s=c=0;c<n;c++)if(l[c]!=d[c]){i=l[c]<d[c];break}if(i&&(r=l,l=d,d=r,e.s=-e.s),(c=(n=d.length)-(t=l.length))>0)for(;c--;)l[t++]=0;for(c=t;n>s;){if(l[--n]<d[n]){for(t=n;t&&!l[--t];)l[t]=9;--l[t],l[n]+=10}l[n]-=d[n]}for(;l[--c]===0;)l.pop();for(;l[0]===0;)l.shift(),--f;return l[0]||(e.s=1,l=[f=0]),e.c=l,e.e=f,e},y.mod=function(e){var t,n=this,r=n.constructor,i=n.s,a=(e=new r(e)).s;if(!e.c[0])throw Error(fe);return n.s=e.s=1,t=e.cmp(n)==1,n.s=i,e.s=a,t?new r(n):(i=r.DP,a=r.RM,r.DP=r.RM=0,n=n.div(e),r.DP=i,r.RM=a,this.minus(n.times(e)))},y.neg=function(){var e=new this.constructor(this);return e.s=-e.s,e},y.plus=y.add=function(e){var t,n,r,i=this,a=i.constructor;if(e=new a(e),i.s!=e.s)return e.s=-e.s,i.minus(e);var o=i.e,s=i.c,c=e.e,l=e.c;if(!s[0]||!l[0])return l[0]||(s[0]?e=new a(i):e.s=i.s),e;if(s=s.slice(),t=o-c){for(t>0?(c=o,r=l):(t=-t,r=s),r.reverse();t--;)r.push(0);r.reverse()}for(s.length-l.length<0&&(r=l,l=s,s=r),t=l.length,n=0;t;s[t]%=10)n=(s[--t]=s[t]+l[t]+n)/10|0;for(n&&(s.unshift(n),++c),t=s.length;s[--t]===0;)s.pop();return e.c=s,e.e=c,e},y.pow=function(e){var t=this,n=new t.constructor(`1`),r=n,i=e<0;if(e!==~~e||e<-1e6||e>ie)throw Error(le+`exponent`);for(i&&(e=-e);e&1&&(r=r.times(t)),e>>=1,e;)t=t.times(t);return i?n.div(r):r},y.prec=function(e,t){if(e!==~~e||e<1||e>re)throw Error(le+`precision`);return ge(new this.constructor(this),e,t)},y.round=function(e,t){if(e===b)e=0;else if(e!==~~e||e<-1e6||e>re)throw Error(ue);return ge(new this.constructor(this),e+this.e+1,t)},y.sqrt=function(){var e,t,n,r=this,i=r.constructor,a=r.s,o=r.e,s=new i(`0.5`);if(!r.c[0])return new i(r);if(a<0)throw Error(ce+`No square root`);a=Math.sqrt(+_e(r,!0,!0)),a===0||a===1/0?(t=r.c.join(``),t.length+o&1||(t+=`0`),a=Math.sqrt(t),o=((o+1)/2|0)-(o<0||o&1),e=new i((a==1/0?`5e`:(a=a.toExponential()).slice(0,a.indexOf(`e`)+1))+o)):e=new i(a+``),o=e.e+(i.DP+=4);do n=e,e=s.times(n.plus(r.div(n)));while(n.c.slice(0,o).join(``)!==e.c.slice(0,o).join(``));return ge(e,(i.DP-=4)+e.e+1,i.RM)},y.times=y.mul=function(e){var t,n=this,r=n.constructor,i=n.c,a=(e=new r(e)).c,o=i.length,s=a.length,c=n.e,l=e.e;if(e.s=n.s==e.s?1:-1,!i[0]||!a[0])return e.c=[e.e=0],e;for(e.e=c+l,o<s&&(t=i,i=a,a=t,l=o,o=s,s=l),t=Array(l=o+s);l--;)t[l]=0;for(c=s;c--;){for(s=0,l=o+c;l>c;)s=t[l]+a[c]*i[l-c-1]+s,t[l--]=s%10,s=s/10|0;t[l]=s}for(s?++e.e:t.shift(),c=t.length;!t[--c];)t.pop();return e.c=t,e},y.toExponential=function(e,t){var n=this,r=n.c[0];if(e!==b){if(e!==~~e||e<0||e>re)throw Error(ue);for(n=ge(new n.constructor(n),++e,t);n.c.length<e;)n.c.push(0)}return _e(n,!0,!!r)},y.toFixed=function(e,t){var n=this,r=n.c[0];if(e!==b){if(e!==~~e||e<0||e>re)throw Error(ue);for(n=ge(new n.constructor(n),e+n.e+1,t),e=e+n.e+1;n.c.length<e;)n.c.push(0)}return _e(n,!1,!!r)},y[Symbol.for(`nodejs.util.inspect.custom`)]=y.toJSON=y.toString=function(){var e=this,t=e.constructor;return _e(e,e.e<=t.NE||e.e>=t.PE,!!e.c[0])},y.toNumber=function(){var e=+_e(this,!0,!0);if(this.constructor.strict===!0&&!this.eq(e.toString()))throw Error(ce+`Imprecise conversion`);return e},y.toPrecision=function(e,t){var n=this,r=n.constructor,i=n.c[0];if(e!==b){if(e!==~~e||e<1||e>re)throw Error(le+`precision`);for(n=ge(new r(n),e,t);n.c.length<e;)n.c.push(0)}return _e(n,e<=n.e||n.e<=r.NE||n.e>=r.PE,!!i)},y.valueOf=function(){var e=this,t=e.constructor;if(t.strict===!0)throw Error(ce+`valueOf disallowed`);return _e(e,e.e<=t.NE||e.e>=t.PE,!0)};var ve=me(),ye={bigNumber(e){return e?new ve(e):new ve(0)},multiply(e,t){if(e===void 0||t===void 0)return new ve(0);let n=new ve(e),r=new ve(t);return n.times(r)},formatNumberToLocalString(e,t=2){return e===void 0?`0.00`:typeof e==`number`?e.toLocaleString(`en-US`,{maximumFractionDigits:t,minimumFractionDigits:t}):parseFloat(e).toLocaleString(`en-US`,{maximumFractionDigits:t,minimumFractionDigits:t})},parseLocalStringToNumber(e){return e===void 0?0:parseFloat(e.replace(/,/gu,``))}},be=[{type:`function`,name:`transfer`,stateMutability:`nonpayable`,inputs:[{name:`_to`,type:`address`},{name:`_value`,type:`uint256`}],outputs:[{name:``,type:`bool`}]},{type:`function`,name:`transferFrom`,stateMutability:`nonpayable`,inputs:[{name:`_from`,type:`address`},{name:`_to`,type:`address`},{name:`_value`,type:`uint256`}],outputs:[{name:``,type:`bool`}]}],xe=[{type:`function`,name:`approve`,stateMutability:`nonpayable`,inputs:[{name:`spender`,type:`address`},{name:`amount`,type:`uint256`}],outputs:[{type:`bool`}]}],Se=[{type:`function`,name:`transfer`,stateMutability:`nonpayable`,inputs:[{name:`recipient`,type:`address`},{name:`amount`,type:`uint256`}],outputs:[]},{type:`function`,name:`transferFrom`,stateMutability:`nonpayable`,inputs:[{name:`sender`,type:`address`},{name:`recipient`,type:`address`},{name:`amount`,type:`uint256`}],outputs:[{name:``,type:`bool`}]}],Ce={getERC20Abi:e=>_.USDT_CONTRACT_ADDRESSES.includes(e)?Se:be,getSwapAbi:()=>xe},x={WALLET_ID:`@appkit/wallet_id`,WALLET_NAME:`@appkit/wallet_name`,SOLANA_WALLET:`@appkit/solana_wallet`,SOLANA_CAIP_CHAIN:`@appkit/solana_caip_chain`,ACTIVE_CAIP_NETWORK_ID:`@appkit/active_caip_network_id`,CONNECTED_SOCIAL:`@appkit/connected_social`,CONNECTED_SOCIAL_USERNAME:`@appkit-wallet/SOCIAL_USERNAME`,RECENT_WALLETS:`@appkit/recent_wallets`,DEEPLINK_CHOICE:`WALLETCONNECT_DEEPLINK_CHOICE`,ACTIVE_NAMESPACE:`@appkit/active_namespace`,CONNECTED_NAMESPACES:`@appkit/connected_namespaces`,CONNECTION_STATUS:`@appkit/connection_status`,SIWX_AUTH_TOKEN:`@appkit/siwx-auth-token`,SIWX_NONCE_TOKEN:`@appkit/siwx-nonce-token`,TELEGRAM_SOCIAL_PROVIDER:`@appkit/social_provider`,NATIVE_BALANCE_CACHE:`@appkit/native_balance_cache`,PORTFOLIO_CACHE:`@appkit/portfolio_cache`,ENS_CACHE:`@appkit/ens_cache`,IDENTITY_CACHE:`@appkit/identity_cache`,PREFERRED_ACCOUNT_TYPES:`@appkit/preferred_account_types`,CONNECTIONS:`@appkit/connections`};function we(e){if(!e)throw Error(`Namespace is required for CONNECTED_CONNECTOR_ID`);return`@appkit/${e}:connected_connector_id`}var S={setItem(e,t){Te()&&t!==void 0&&localStorage.setItem(e,t)},getItem(e){if(Te())return localStorage.getItem(e)||void 0},removeItem(e){Te()&&localStorage.removeItem(e)},clear(){Te()&&localStorage.clear()}};function Te(){return typeof window<`u`&&typeof localStorage<`u`}function Ee(e,t){return t===`light`?{"--w3m-accent":e?.[`--w3m-accent`]||`hsla(231, 100%, 70%, 1)`,"--w3m-background":`#fff`}:{"--w3m-accent":e?.[`--w3m-accent`]||`hsla(230, 100%, 67%, 1)`,"--w3m-background":`#121313`}}var De=(typeof process<`u`?{}.NEXT_PUBLIC_SECURE_SITE_ORIGIN:void 0)||`https://secure.walletconnect.org`,Oe=[{label:`Coinbase`,name:`coinbase`,feeRange:`1-2%`,url:``,supportedChains:[`eip155`]},{label:`Meld.io`,name:`meld`,feeRange:`1-2%`,url:`https://meldcrypto.com`,supportedChains:[`eip155`,`solana`]}],ke=`WXETMuFUQmqqybHuRkSgxv:25B8LJHSfpG6LVjR2ytU5Cwh7Z4Sch2ocoU`,C={FOUR_MINUTES_MS:24e4,TEN_SEC_MS:1e4,FIVE_SEC_MS:5e3,THREE_SEC_MS:3e3,ONE_SEC_MS:1e3,SECURE_SITE:De,SECURE_SITE_DASHBOARD:`${De}/dashboard`,SECURE_SITE_FAVICON:`${De}/images/favicon.png`,RESTRICTED_TIMEZONES:[`ASIA/SHANGHAI`,`ASIA/URUMQI`,`ASIA/CHONGQING`,`ASIA/HARBIN`,`ASIA/KASHGAR`,`ASIA/MACAU`,`ASIA/HONG_KONG`,`ASIA/MACAO`,`ASIA/BEIJING`,`ASIA/HARBIN`],WC_COINBASE_PAY_SDK_CHAINS:[`ethereum`,`arbitrum`,`polygon`,`berachain`,`avalanche-c-chain`,`optimism`,`celo`,`base`],WC_COINBASE_PAY_SDK_FALLBACK_CHAIN:`ethereum`,WC_COINBASE_PAY_SDK_CHAIN_NAME_MAP:{Ethereum:`ethereum`,"Arbitrum One":`arbitrum`,Polygon:`polygon`,Berachain:`berachain`,Avalanche:`avalanche-c-chain`,"OP Mainnet":`optimism`,Celo:`celo`,Base:`base`},WC_COINBASE_ONRAMP_APP_ID:`bf18c88d-495a-463b-b249-0b9d3656cf5e`,SWAP_SUGGESTED_TOKENS:`ETH.UNI.1INCH.AAVE.SOL.ADA.AVAX.DOT.LINK.NITRO.GAIA.MILK.TRX.NEAR.GNO.WBTC.DAI.WETH.USDC.USDT.ARB.BAL.BICO.CRV.ENS.MATIC.OP`.split(`.`),SWAP_POPULAR_TOKENS:`ETH.UNI.1INCH.AAVE.SOL.ADA.AVAX.DOT.LINK.NITRO.GAIA.MILK.TRX.NEAR.GNO.WBTC.DAI.WETH.USDC.USDT.ARB.BAL.BICO.CRV.ENS.MATIC.OP.METAL.DAI.CHAMP.WOLF.SALE.BAL.BUSD.MUST.BTCpx.ROUTE.HEX.WELT.amDAI.VSQ.VISION.AURUM.pSP.SNX.VC.LINK.CHP.amUSDT.SPHERE.FOX.GIDDY.GFC.OMEN.OX_OLD.DE.WNT`.split(`.`),BALANCE_SUPPORTED_CHAINS:[`eip155`,`solana`],SWAP_SUPPORTED_NETWORKS:[`eip155:1`,`eip155:42161`,`eip155:10`,`eip155:324`,`eip155:8453`,`eip155:56`,`eip155:137`,`eip155:100`,`eip155:43114`,`eip155:250`,`eip155:8217`,`eip155:1313161554`],NAMES_SUPPORTED_CHAIN_NAMESPACES:[`eip155`],ONRAMP_SUPPORTED_CHAIN_NAMESPACES:[`eip155`,`solana`],ACTIVITY_ENABLED_CHAIN_NAMESPACES:[`eip155`],NATIVE_TOKEN_ADDRESS:{eip155:`0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`,solana:`So11111111111111111111111111111111111111111`,polkadot:`0x`,bip122:`0x`,cosmos:`0x`},CONVERT_SLIPPAGE_TOLERANCE:1,CONNECT_LABELS:{MOBILE:`Open and continue in the wallet app`,WEB:`Open and continue in the wallet app`},SEND_SUPPORTED_NAMESPACES:[`eip155`,`solana`],DEFAULT_REMOTE_FEATURES:{swaps:[`1inch`],onramp:[`coinbase`,`meld`],email:!0,socials:[`google`,`x`,`discord`,`farcaster`,`github`,`apple`,`facebook`],activity:!0,reownBranding:!0},DEFAULT_REMOTE_FEATURES_DISABLED:{email:!1,socials:!1,swaps:!1,onramp:!1,activity:!1,reownBranding:!1},DEFAULT_FEATURES:{receive:!0,send:!0,emailShowWallets:!0,connectorTypeOrder:[`walletConnect`,`recent`,`injected`,`featured`,`custom`,`external`,`recommended`],analytics:!0,allWallets:!0,legalCheckbox:!1,smartSessions:!1,collapseWallets:!1,walletFeaturesOrder:[`onramp`,`swaps`,`receive`,`send`],connectMethodsOrder:void 0,pay:!1},DEFAULT_SOCIALS:[`google`,`x`,`farcaster`,`discord`,`apple`,`github`,`facebook`],DEFAULT_ACCOUNT_TYPES:{bip122:`payment`,eip155:`smartAccount`,polkadot:`eoa`,solana:`eoa`},ADAPTER_TYPES:{UNIVERSAL:`universal`,SOLANA:`solana`,WAGMI:`wagmi`,ETHERS:`ethers`,ETHERS5:`ethers5`,BITCOIN:`bitcoin`}},w={cacheExpiry:{portfolio:3e4,nativeBalance:3e4,ens:3e5,identity:3e5},isCacheExpired(e,t){return Date.now()-e>t},getActiveNetworkProps(){let e=w.getActiveNamespace(),t=w.getActiveCaipNetworkId(),n=t?t.split(`:`)[1]:void 0;return{namespace:e,caipNetworkId:t,chainId:n?isNaN(Number(n))?n:Number(n):void 0}},setWalletConnectDeepLink({name:e,href:t}){try{S.setItem(x.DEEPLINK_CHOICE,JSON.stringify({href:t,name:e}))}catch{console.info(`Unable to set WalletConnect deep link`)}},getWalletConnectDeepLink(){try{let e=S.getItem(x.DEEPLINK_CHOICE);if(e)return JSON.parse(e)}catch{console.info(`Unable to get WalletConnect deep link`)}},deleteWalletConnectDeepLink(){try{S.removeItem(x.DEEPLINK_CHOICE)}catch{console.info(`Unable to delete WalletConnect deep link`)}},setActiveNamespace(e){try{S.setItem(x.ACTIVE_NAMESPACE,e)}catch{console.info(`Unable to set active namespace`)}},setActiveCaipNetworkId(e){try{S.setItem(x.ACTIVE_CAIP_NETWORK_ID,e),w.setActiveNamespace(e.split(`:`)[0])}catch{console.info(`Unable to set active caip network id`)}},getActiveCaipNetworkId(){try{return S.getItem(x.ACTIVE_CAIP_NETWORK_ID)}catch{console.info(`Unable to get active caip network id`);return}},deleteActiveCaipNetworkId(){try{S.removeItem(x.ACTIVE_CAIP_NETWORK_ID)}catch{console.info(`Unable to delete active caip network id`)}},deleteConnectedConnectorId(e){try{let t=we(e);S.removeItem(t)}catch{console.info(`Unable to delete connected connector id`)}},setAppKitRecent(e){try{let t=w.getRecentWallets();t.find(t=>t.id===e.id)||(t.unshift(e),t.length>2&&t.pop(),S.setItem(x.RECENT_WALLETS,JSON.stringify(t)))}catch{console.info(`Unable to set AppKit recent`)}},getRecentWallets(){try{let e=S.getItem(x.RECENT_WALLETS);return e?JSON.parse(e):[]}catch{console.info(`Unable to get AppKit recent`)}return[]},setConnectedConnectorId(e,t){try{let n=we(e);S.setItem(n,t)}catch{console.info(`Unable to set Connected Connector Id`)}},getActiveNamespace(){try{return S.getItem(x.ACTIVE_NAMESPACE)}catch{console.info(`Unable to get active namespace`)}},getConnectedConnectorId(e){if(e)try{let t=we(e);return S.getItem(t)}catch{console.info(`Unable to get connected connector id in namespace `,e)}},setConnectedSocialProvider(e){try{S.setItem(x.CONNECTED_SOCIAL,e)}catch{console.info(`Unable to set connected social provider`)}},getConnectedSocialProvider(){try{return S.getItem(x.CONNECTED_SOCIAL)}catch{console.info(`Unable to get connected social provider`)}},deleteConnectedSocialProvider(){try{S.removeItem(x.CONNECTED_SOCIAL)}catch{console.info(`Unable to delete connected social provider`)}},getConnectedSocialUsername(){try{return S.getItem(x.CONNECTED_SOCIAL_USERNAME)}catch{console.info(`Unable to get connected social username`)}},getStoredActiveCaipNetworkId(){return S.getItem(x.ACTIVE_CAIP_NETWORK_ID)?.split(`:`)?.[1]},setConnectionStatus(e){try{S.setItem(x.CONNECTION_STATUS,e)}catch{console.info(`Unable to set connection status`)}},getConnectionStatus(){try{return S.getItem(x.CONNECTION_STATUS)}catch{return}},getConnectedNamespaces(){try{let e=S.getItem(x.CONNECTED_NAMESPACES);return e?.length?e.split(`,`):[]}catch{return[]}},setConnectedNamespaces(e){try{let t=Array.from(new Set(e));S.setItem(x.CONNECTED_NAMESPACES,t.join(`,`))}catch{console.info(`Unable to set namespaces in storage`)}},addConnectedNamespace(e){try{let t=w.getConnectedNamespaces();t.includes(e)||(t.push(e),w.setConnectedNamespaces(t))}catch{console.info(`Unable to add connected namespace`)}},removeConnectedNamespace(e){try{let t=w.getConnectedNamespaces(),n=t.indexOf(e);n>-1&&(t.splice(n,1),w.setConnectedNamespaces(t))}catch{console.info(`Unable to remove connected namespace`)}},getTelegramSocialProvider(){try{return S.getItem(x.TELEGRAM_SOCIAL_PROVIDER)}catch{return console.info(`Unable to get telegram social provider`),null}},setTelegramSocialProvider(e){try{S.setItem(x.TELEGRAM_SOCIAL_PROVIDER,e)}catch{console.info(`Unable to set telegram social provider`)}},removeTelegramSocialProvider(){try{S.removeItem(x.TELEGRAM_SOCIAL_PROVIDER)}catch{console.info(`Unable to remove telegram social provider`)}},getBalanceCache(){let e={};try{let t=S.getItem(x.PORTFOLIO_CACHE);e=t?JSON.parse(t):{}}catch{console.info(`Unable to get balance cache`)}return e},removeAddressFromBalanceCache(e){try{let t=w.getBalanceCache();S.setItem(x.PORTFOLIO_CACHE,JSON.stringify({...t,[e]:void 0}))}catch{console.info(`Unable to remove address from balance cache`,e)}},getBalanceCacheForCaipAddress(e){try{let t=w.getBalanceCache()[e];if(t&&!this.isCacheExpired(t.timestamp,this.cacheExpiry.portfolio))return t.balance;w.removeAddressFromBalanceCache(e)}catch{console.info(`Unable to get balance cache for address`,e)}},updateBalanceCache(e){try{let t=w.getBalanceCache();t[e.caipAddress]=e,S.setItem(x.PORTFOLIO_CACHE,JSON.stringify(t))}catch{console.info(`Unable to update balance cache`,e)}},getNativeBalanceCache(){let e={};try{let t=S.getItem(x.NATIVE_BALANCE_CACHE);e=t?JSON.parse(t):{}}catch{console.info(`Unable to get balance cache`)}return e},removeAddressFromNativeBalanceCache(e){try{let t=w.getBalanceCache();S.setItem(x.NATIVE_BALANCE_CACHE,JSON.stringify({...t,[e]:void 0}))}catch{console.info(`Unable to remove address from balance cache`,e)}},getNativeBalanceCacheForCaipAddress(e){try{let t=w.getNativeBalanceCache()[e];if(t&&!this.isCacheExpired(t.timestamp,this.cacheExpiry.nativeBalance))return t;console.info(`Discarding cache for address`,e),w.removeAddressFromBalanceCache(e)}catch{console.info(`Unable to get balance cache for address`,e)}},updateNativeBalanceCache(e){try{let t=w.getNativeBalanceCache();t[e.caipAddress]=e,S.setItem(x.NATIVE_BALANCE_CACHE,JSON.stringify(t))}catch{console.info(`Unable to update balance cache`,e)}},getEnsCache(){let e={};try{let t=S.getItem(x.ENS_CACHE);e=t?JSON.parse(t):{}}catch{console.info(`Unable to get ens name cache`)}return e},getEnsFromCacheForAddress(e){try{let t=w.getEnsCache()[e];if(t&&!this.isCacheExpired(t.timestamp,this.cacheExpiry.ens))return t.ens;w.removeEnsFromCache(e)}catch{console.info(`Unable to get ens name from cache`,e)}},updateEnsCache(e){try{let t=w.getEnsCache();t[e.address]=e,S.setItem(x.ENS_CACHE,JSON.stringify(t))}catch{console.info(`Unable to update ens name cache`,e)}},removeEnsFromCache(e){try{let t=w.getEnsCache();S.setItem(x.ENS_CACHE,JSON.stringify({...t,[e]:void 0}))}catch{console.info(`Unable to remove ens name from cache`,e)}},getIdentityCache(){let e={};try{let t=S.getItem(x.IDENTITY_CACHE);e=t?JSON.parse(t):{}}catch{console.info(`Unable to get identity cache`)}return e},getIdentityFromCacheForAddress(e){try{let t=w.getIdentityCache()[e];if(t&&!this.isCacheExpired(t.timestamp,this.cacheExpiry.identity))return t.identity;w.removeIdentityFromCache(e)}catch{console.info(`Unable to get identity from cache`,e)}},updateIdentityCache(e){try{let t=w.getIdentityCache();t[e.address]={identity:e.identity,timestamp:e.timestamp},S.setItem(x.IDENTITY_CACHE,JSON.stringify(t))}catch{console.info(`Unable to update identity cache`,e)}},removeIdentityFromCache(e){try{let t=w.getIdentityCache();S.setItem(x.IDENTITY_CACHE,JSON.stringify({...t,[e]:void 0}))}catch{console.info(`Unable to remove identity from cache`,e)}},clearAddressCache(){try{S.removeItem(x.PORTFOLIO_CACHE),S.removeItem(x.NATIVE_BALANCE_CACHE),S.removeItem(x.ENS_CACHE),S.removeItem(x.IDENTITY_CACHE)}catch{console.info(`Unable to clear address cache`)}},setPreferredAccountTypes(e){try{S.setItem(x.PREFERRED_ACCOUNT_TYPES,JSON.stringify(e))}catch{console.info(`Unable to set preferred account types`,e)}},getPreferredAccountTypes(){try{let e=S.getItem(x.PREFERRED_ACCOUNT_TYPES);return e?JSON.parse(e):{}}catch{console.info(`Unable to get preferred account types`)}return{}},setConnections(e,t){try{let n={...w.getConnections(),[t]:e};S.setItem(x.CONNECTIONS,JSON.stringify(n))}catch(e){console.error(`Unable to sync connections to storage`,e)}},getConnections(){try{let e=S.getItem(x.CONNECTIONS);return e?JSON.parse(e):{}}catch(e){return console.error(`Unable to get connections from storage`,e),{}}}},T={isMobile(){return this.isClient()?!!(typeof window?.matchMedia==`function`&&window?.matchMedia(`(pointer:coarse)`)?.matches||/Android|webOS|iPhone|iPad|iPod|BlackBerry|Opera Mini/u.test(navigator.userAgent)):!1},checkCaipNetwork(e,t=``){return e?.caipNetworkId.toLocaleLowerCase().includes(t.toLowerCase())},isAndroid(){if(!this.isMobile())return!1;let e=window?.navigator.userAgent.toLowerCase();return T.isMobile()&&e.includes(`android`)},isIos(){if(!this.isMobile())return!1;let e=window?.navigator.userAgent.toLowerCase();return e.includes(`iphone`)||e.includes(`ipad`)},isSafari(){return this.isClient()?(window?.navigator.userAgent.toLowerCase()).includes(`safari`):!1},isClient(){return typeof window<`u`},isPairingExpired(e){return!e||e-Date.now()<=C.TEN_SEC_MS},isAllowedRetry(e,t=C.ONE_SEC_MS){return Date.now()-e>=t},copyToClopboard(e){navigator.clipboard.writeText(e)},isIframe(){try{return window?.self!==window?.top}catch{return!1}},isSafeApp(){if(T.isClient()&&window.self!==window.top)try{let e=window?.location?.ancestorOrigins?.[0];if(e){let t=new URL(e),n=new URL(`https://app.safe.global`);return t.hostname===n.hostname}}catch{return!1}return!1},getPairingExpiry(){return Date.now()+C.FOUR_MINUTES_MS},getNetworkId(e){return e?.split(`:`)[1]},getPlainAddress(e){return e?.split(`:`)[2]},async wait(e){return new Promise(t=>{setTimeout(t,e)})},debounce(e,t=500){let n;return(...r)=>{function i(){e(...r)}n&&clearTimeout(n),n=setTimeout(i,t)}},isHttpUrl(e){return e.startsWith(`http://`)||e.startsWith(`https://`)},formatNativeUrl(e,t,n=null){if(T.isHttpUrl(e))return this.formatUniversalUrl(e,t);let r=e,i=n;r.includes(`://`)||(r=e.replaceAll(`/`,``).replaceAll(`:`,``),r=`${r}://`),r.endsWith(`/`)||(r=`${r}/`),i&&!i?.endsWith(`/`)&&(i=`${i}/`),this.isTelegram()&&this.isAndroid()&&(t=encodeURIComponent(t));let a=encodeURIComponent(t);return{redirect:`${r}wc?uri=${a}`,redirectUniversalLink:i?`${i}wc?uri=${a}`:void 0,href:r}},formatUniversalUrl(e,t){if(!T.isHttpUrl(e))return this.formatNativeUrl(e,t);let n=e;return n.endsWith(`/`)||(n=`${n}/`),{redirect:`${n}wc?uri=${encodeURIComponent(t)}`,href:n}},getOpenTargetForPlatform(e){return e===`popupWindow`?e:this.isTelegram()?w.getTelegramSocialProvider()?`_top`:`_blank`:e},openHref(e,t,n){window?.open(e,this.getOpenTargetForPlatform(t),n||`noreferrer noopener`)},returnOpenHref(e,t,n){return window?.open(e,this.getOpenTargetForPlatform(t),n||`noreferrer noopener`)},isTelegram(){return typeof window<`u`&&(!!window.TelegramWebviewProxy||!!window.Telegram||!!window.TelegramWebviewProxyProto)},isPWA(){if(typeof window>`u`)return!1;let e=window.matchMedia?.(`(display-mode: standalone)`)?.matches,t=window?.navigator?.standalone;return!!(e||t)},async preloadImage(e){let t=new Promise((t,n)=>{let r=new Image;r.onload=t,r.onerror=n,r.crossOrigin=`anonymous`,r.src=e});return Promise.race([t,T.wait(2e3)])},formatBalance(e,t){let n=`0.000`;if(typeof e==`string`){let t=Number(e);if(t){let e=Math.floor(t*1e3)/1e3;e&&(n=e.toString())}}return`${n}${t?` ${t}`:``}`},formatBalance2(e,t){let n;if(e===`0`)n=`0`;else if(typeof e==`string`){let t=Number(e);t&&(n=t.toString().match(/^-?\d+(?:\.\d{0,3})?/u)?.[0])}return{value:n??`0`,rest:n===`0`?`000`:``,symbol:t}},getApiUrl(){return _.W3M_API_URL},getBlockchainApiUrl(){return _.BLOCKCHAIN_API_RPC_URL},getAnalyticsUrl(){return _.PULSE_API_URL},getUUID(){return crypto?.randomUUID?crypto.randomUUID():`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/gu,e=>{let t=Math.random()*16|0;return(e===`x`?t:t&3|8).toString(16)})},parseError(e){return typeof e==`string`?e:typeof e?.issues?.[0]?.message==`string`?e.issues[0].message:e instanceof Error?e.message:`Unknown error`},sortRequestedNetworks(e,t=[]){let n={};return t&&e&&(e.forEach((e,t)=>{n[e]=t}),t.sort((e,t)=>{let r=n[e.id],i=n[t.id];return r!==void 0&&i!==void 0?r-i:r===void 0?i===void 0?0:1:-1})),t},calculateBalance(e){let t=0;for(let n of e)t+=n.value??0;return t},formatTokenBalance(e){let[t,n]=e.toFixed(2).split(`.`);return{dollars:t,pennies:n}},isAddress(e,t=`eip155`){switch(t){case`eip155`:return/^(?:0x)?[0-9a-f]{40}$/iu.test(e)?!!(/^(?:0x)?[0-9a-f]{40}$/iu.test(e)||/^(?:0x)?[0-9A-F]{40}$/iu.test(e)):!1;case`solana`:return/[1-9A-HJ-NP-Za-km-z]{32,44}$/iu.test(e);default:return!1}},uniqueBy(e,t){let n=new Set;return e.filter(e=>{let r=e[t];return!n.has(r)&&(n.add(r),!0)})},generateSdkVersion(e,t,n){return`${t}-${e.length===0?C.ADAPTER_TYPES.UNIVERSAL:e.map(e=>e.adapterType).join(`,`)}-${n}`},createAccount(e,t,n,r,i){return{namespace:e,address:t,type:n,publicKey:r,path:i}},isCaipAddress(e){if(typeof e!=`string`)return!1;let t=e.split(`:`),n=t[0];return t.filter(Boolean).length===3&&n in _.CHAIN_NAME_MAP},isMac(){let e=window?.navigator.userAgent.toLowerCase();return e.includes(`macintosh`)&&!e.includes(`safari`)},formatTelegramSocialLoginUrl(e){let t=`--${encodeURIComponent(window?.location.href)}`,n=`state=`;if(new URL(e).host===`auth.magic.link`){let r=e.substring(e.indexOf(`provider_authorization_url=`)+27),i=this.injectIntoUrl(decodeURIComponent(r),n,t);return e.replace(r,encodeURIComponent(i))}return this.injectIntoUrl(e,n,t)},injectIntoUrl(e,t,n){let r=e.indexOf(t);if(r===-1)throw Error(`${t} parameter not found in the URL: ${e}`);let i=e.indexOf(`&`,r),a=t.length,o=i===-1?e.length:i,s=e.substring(0,r+a),c=e.substring(r+a,o),l=e.substring(i);return s+(c+n)+l}};async function Ae(...e){let t=await fetch(...e);if(!t.ok)throw Error(`HTTP status code: ${t.status}`,{cause:t});return t}var je=class{constructor({baseUrl:e,clientId:t}){this.baseUrl=e,this.clientId=t}async get({headers:e,signal:t,cache:n,...r}){return(await Ae(this.createUrl(r),{method:`GET`,headers:e,signal:t,cache:n})).json()}async getBlob({headers:e,signal:t,...n}){return(await Ae(this.createUrl(n),{method:`GET`,headers:e,signal:t})).blob()}async post({body:e,headers:t,signal:n,...r}){return(await Ae(this.createUrl(r),{method:`POST`,headers:t,body:e?JSON.stringify(e):void 0,signal:n})).json()}async put({body:e,headers:t,signal:n,...r}){return(await Ae(this.createUrl(r),{method:`PUT`,headers:t,body:e?JSON.stringify(e):void 0,signal:n})).json()}async delete({body:e,headers:t,signal:n,...r}){return(await Ae(this.createUrl(r),{method:`DELETE`,headers:t,body:e?JSON.stringify(e):void 0,signal:n})).json()}createUrl({path:e,params:t}){let n=new URL(e,this.baseUrl);return t&&Object.entries(t).forEach(([e,t])=>{t&&n.searchParams.append(e,t)}),this.clientId&&n.searchParams.append(`clientId`,this.clientId),n}},Me={getFeatureValue(e,t){let n=t?.[e];return n===void 0?C.DEFAULT_FEATURES[e]:n},filterSocialsByPlatform(e){if(!e||!e.length)return e;if(T.isTelegram()){if(T.isIos())return e.filter(e=>e!==`google`);if(T.isMac())return e.filter(e=>e!==`x`);if(T.isAndroid())return e.filter(e=>![`facebook`,`x`].includes(e))}return e}},E=f({features:C.DEFAULT_FEATURES,projectId:``,sdkType:`appkit`,sdkVersion:`html-wagmi-undefined`,defaultAccountTypes:C.DEFAULT_ACCOUNT_TYPES,enableNetworkSwitch:!0,experimental_preferUniversalLinks:!1,remoteFeatures:{}}),D={state:E,subscribeKey(e,t){return g(E,e,t)},setOptions(e){Object.assign(E,e)},setRemoteFeatures(e){e&&(E.remoteFeatures={...E.remoteFeatures,...e},E.remoteFeatures?.socials&&(E.remoteFeatures.socials=Me.filterSocialsByPlatform(E.remoteFeatures.socials)))},setFeatures(e){e&&(E.features||=C.DEFAULT_FEATURES,E.features={...E.features,...e})},setProjectId(e){E.projectId=e},setCustomRpcUrls(e){E.customRpcUrls=e},setAllWallets(e){E.allWallets=e},setIncludeWalletIds(e){E.includeWalletIds=e},setExcludeWalletIds(e){E.excludeWalletIds=e},setFeaturedWalletIds(e){E.featuredWalletIds=e},setTokens(e){E.tokens=e},setTermsConditionsUrl(e){E.termsConditionsUrl=e},setPrivacyPolicyUrl(e){E.privacyPolicyUrl=e},setCustomWallets(e){E.customWallets=e},setIsSiweEnabled(e){E.isSiweEnabled=e},setIsUniversalProvider(e){E.isUniversalProvider=e},setSdkVersion(e){E.sdkVersion=e},setMetadata(e){E.metadata=e},setDisableAppend(e){E.disableAppend=e},setEIP6963Enabled(e){E.enableEIP6963=e},setDebug(e){E.debug=e},setEnableWalletConnect(e){E.enableWalletConnect=e},setEnableWalletGuide(e){E.enableWalletGuide=e},setEnableAuthLogger(e){E.enableAuthLogger=e},setEnableWallets(e){E.enableWallets=e},setPreferUniversalLinks(e){E.experimental_preferUniversalLinks=e},setHasMultipleAddresses(e){E.hasMultipleAddresses=e},setSIWX(e){E.siwx=e},setConnectMethodsOrder(e){E.features={...E.features,connectMethodsOrder:e}},setWalletFeaturesOrder(e){E.features={...E.features,walletFeaturesOrder:e}},setSocialsOrder(e){E.remoteFeatures={...E.remoteFeatures,socials:e}},setCollapseWallets(e){E.features={...E.features,collapseWallets:e}},setEnableEmbedded(e){E.enableEmbedded=e},setAllowUnsupportedChain(e){E.allowUnsupportedChain=e},setManualWCControl(e){E.manualWCControl=e},setEnableNetworkSwitch(e){E.enableNetworkSwitch=e},setDefaultAccountTypes(e={}){Object.entries(e).forEach(([e,t])=>{t&&(E.defaultAccountTypes[e]=t)})},setUniversalProviderConfigOverride(e){E.universalProviderConfigOverride=e},getUniversalProviderConfigOverride(){return E.universalProviderConfigOverride},getSnapshot(){return m(E)}},Ne=Object.freeze({enabled:!0,events:[]}),Pe=new je({baseUrl:T.getAnalyticsUrl(),clientId:null}),Fe=5,Ie=6e4,Le=f({...Ne}),Re={state:Le,subscribeKey(e,t){return g(Le,e,t)},async sendError(e,t){if(!Le.enabled)return;let n=Date.now();if(Le.events.filter(e=>{let t=new Date(e.properties.timestamp||``).getTime();return n-t<Ie}).length>=Fe)return;let r={type:`error`,event:t,properties:{errorType:e.name,errorMessage:e.message,stackTrace:e.stack,timestamp:new Date().toISOString()}};Le.events.push(r);try{if(typeof window>`u`)return;let{projectId:n,sdkType:r,sdkVersion:i}=D.state;await Pe.post({path:`/e`,params:{projectId:n,st:r,sv:i||`html-wagmi-4.2.2`},body:{eventId:T.getUUID(),url:window.location.href,domain:window.location.hostname,timestamp:new Date().toISOString(),props:{type:`error`,event:t,errorType:e.name,errorMessage:e.message,stackTrace:e.stack}}})}catch{}},enable(){Le.enabled=!0},disable(){Le.enabled=!1},clearEvents(){Le.events=[]}},ze=class e extends Error{constructor(t,n,r){super(t),this.name=`AppKitError`,this.category=n,this.originalError=r,Object.setPrototypeOf(this,e.prototype);let i=!1;if(r instanceof Error&&typeof r.stack==`string`&&r.stack){let e=r.stack,t=e.indexOf(`
`);if(t>-1){let n=e.substring(t+1);this.stack=`${this.name}: ${this.message}\n${n}`,i=!0}}i||(Error.captureStackTrace?Error.captureStackTrace(this,e):this.stack||=`${this.name}: ${this.message}`)}};function Be(e,t){let n=e instanceof ze?e:new ze(e instanceof Error?e.message:String(e),t,e);throw Re.sendError(n,n.category),n}function O(e,t=`INTERNAL_SDK_ERROR`){let n={};return Object.keys(e).forEach(r=>{let i=e[r];if(typeof i==`function`){let e=i;e=i.constructor.name===`AsyncFunction`?async(...e)=>{try{return await i(...e)}catch(e){return Be(e,t)}}:(...e)=>{try{return i(...e)}catch(e){return Be(e,t)}},n[r]=e}else n[r]=i}),n}var k={PHANTOM:{id:`a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393`,url:`https://phantom.app`},SOLFLARE:{id:`1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79`,url:`https://solflare.com`},COINBASE:{id:`fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa`,url:`https://go.cb-w.com`}},Ve={handleMobileDeeplinkRedirect(e,t){let n=window.location.href,r=encodeURIComponent(n);if(e===k.PHANTOM.id&&!(`phantom`in window)){let e=n.startsWith(`https`)?`https`:`http`,t=n.split(`/`)[2],i=encodeURIComponent(`${e}://${t}`);window.location.href=`${k.PHANTOM.url}/ul/browse/${r}?ref=${i}`}e===k.SOLFLARE.id&&!(`solflare`in window)&&(window.location.href=`${k.SOLFLARE.url}/ul/v1/browse/${r}?ref=${r}`),t===_.CHAIN.SOLANA&&e===k.COINBASE.id&&!(`coinbaseSolana`in window)&&(window.location.href=`${k.COINBASE.url}/dapp?cb_url=${r}`)}},A=f({walletImages:{},networkImages:{},chainImages:{},connectorImages:{},tokenImages:{},currencyImages:{}}),j=O({state:A,subscribeNetworkImages(e){return p(A.networkImages,()=>e(A.networkImages))},subscribeKey(e,t){return g(A,e,t)},subscribe(e){return p(A,()=>e(A))},setWalletImage(e,t){A.walletImages[e]=t},setNetworkImage(e,t){A.networkImages[e]=t},setChainImage(e,t){A.chainImages[e]=t},setConnectorImage(e,t){A.connectorImages={...A.connectorImages,[e]:t}},setTokenImage(e,t){A.tokenImages[e]=t},setCurrencyImage(e,t){A.currencyImages[e]=t}}),He={eip155:`ba0ba0cd-17c6-4806-ad93-f9d174f17900`,solana:`a1b58899-f671-4276-6a5e-56ca5bd59700`,polkadot:``,bip122:`0b4838db-0161-4ffe-022d-532bf03dba00`,cosmos:``},Ue=f({networkImagePromises:{}}),We={async fetchWalletImage(e){if(e)return await I._fetchWalletImage(e),this.getWalletImageById(e)},async fetchNetworkImage(e){return e?this.getNetworkImageById(e)||(Ue.networkImagePromises[e]||(Ue.networkImagePromises[e]=I._fetchNetworkImage(e)),await Ue.networkImagePromises[e],this.getNetworkImageById(e)):void 0},getWalletImageById(e){if(e)return j.state.walletImages[e]},getWalletImage(e){if(e?.image_url)return e?.image_url;if(e?.image_id)return j.state.walletImages[e.image_id]},getNetworkImage(e){if(e?.assets?.imageUrl)return e?.assets?.imageUrl;if(e?.assets?.imageId)return j.state.networkImages[e.assets.imageId]},getNetworkImageById(e){if(e)return j.state.networkImages[e]},getConnectorImage(e){if(e?.imageUrl)return e.imageUrl;if(e?.imageId)return j.state.connectorImages[e.imageId]},getChainImage(e){return j.state.networkImages[He[e]]}},Ge=f({message:``,variant:`info`,open:!1}),Ke=O({state:Ge,subscribeKey(e,t){return g(Ge,e,t)},open(e,t){let{debug:n}=D.state,{shortMessage:r,longMessage:i}=e;n&&(Ge.message=r,Ge.variant=t,Ge.open=!0),i&&console.error(typeof i==`function`?i():i)},close(){Ge.open=!1,Ge.message=``,Ge.variant=`info`}}),qe=new je({baseUrl:T.getAnalyticsUrl(),clientId:null}),Je=[`MODAL_CREATED`],M=f({timestamp:Date.now(),reportedErrors:{},data:{type:`track`,event:`MODAL_CREATED`}}),N={state:M,subscribe(e){return p(M,()=>e(M))},getSdkProperties(){let{projectId:e,sdkType:t,sdkVersion:n}=D.state;return{projectId:e,st:t,sv:n||`html-wagmi-4.2.2`}},async _sendAnalyticsEvent(e){try{let t=Q.state.address;if(Je.includes(e.data.event)||typeof window>`u`)return;await qe.post({path:`/e`,params:N.getSdkProperties(),body:{eventId:T.getUUID(),url:window.location.href,domain:window.location.hostname,timestamp:e.timestamp,props:{...e.data,address:t}}}),M.reportedErrors.FORBIDDEN=!1}catch(e){e instanceof Error&&e.cause instanceof Response&&e.cause.status===_.HTTP_STATUS_CODES.FORBIDDEN&&!M.reportedErrors.FORBIDDEN&&(Ke.open({shortMessage:`Invalid App Configuration`,longMessage:`Origin ${Te()?window.origin:`uknown`} not found on Allowlist - update configuration on cloud.reown.com`},`error`),M.reportedErrors.FORBIDDEN=!0)}},sendEvent(e){M.timestamp=Date.now(),M.data=e,D.state.features?.analytics&&N._sendAnalyticsEvent(M)}},P=new je({baseUrl:T.getApiUrl(),clientId:null}),Ye=40,Xe=4,Ze=20,F=f({promises:{},page:1,count:0,featured:[],allFeatured:[],recommended:[],allRecommended:[],wallets:[],filteredWallets:[],search:[],isAnalyticsEnabled:!1,excludedWallets:[],isFetchingRecommendedWallets:!1}),I={state:F,subscribeKey(e,t){return g(F,e,t)},_getSdkProperties(){let{projectId:e,sdkType:t,sdkVersion:n}=D.state;return{projectId:e,st:t||`appkit`,sv:n||`html-wagmi-4.2.2`}},_filterOutExtensions(e){return D.state.isUniversalProvider?e.filter(e=>!!(e.mobile_link||e.desktop_link||e.webapp_link)):e},async _fetchWalletImage(e){let t=`${P.baseUrl}/getWalletImage/${e}`,n=await P.getBlob({path:t,params:I._getSdkProperties()});j.setWalletImage(e,URL.createObjectURL(n))},async _fetchNetworkImage(e){let t=`${P.baseUrl}/public/getAssetImage/${e}`,n=await P.getBlob({path:t,params:I._getSdkProperties()});j.setNetworkImage(e,URL.createObjectURL(n))},async _fetchConnectorImage(e){let t=`${P.baseUrl}/public/getAssetImage/${e}`,n=await P.getBlob({path:t,params:I._getSdkProperties()});j.setConnectorImage(e,URL.createObjectURL(n))},async _fetchCurrencyImage(e){let t=`${P.baseUrl}/public/getCurrencyImage/${e}`,n=await P.getBlob({path:t,params:I._getSdkProperties()});j.setCurrencyImage(e,URL.createObjectURL(n))},async _fetchTokenImage(e){let t=`${P.baseUrl}/public/getTokenImage/${e}`,n=await P.getBlob({path:t,params:I._getSdkProperties()});j.setTokenImage(e,URL.createObjectURL(n))},_filterWalletsByPlatform(e){return T.isMobile()?e?.filter(e=>e.mobile_link||e.id===k.COINBASE.id?!0:J.state.activeChain===`solana`&&(e.id===k.SOLFLARE.id||e.id===k.PHANTOM.id)):e},async fetchProjectConfig(){return(await P.get({path:`/appkit/v1/config`,params:I._getSdkProperties()})).features},async fetchAllowedOrigins(){try{let{allowedOrigins:e}=await P.get({path:`/projects/v1/origins`,params:I._getSdkProperties()});return e}catch{return[]}},async fetchNetworkImages(){let e=J.getAllRequestedCaipNetworks()?.map(({assets:e})=>e?.imageId).filter(Boolean).filter(e=>!We.getNetworkImageById(e));e&&await Promise.allSettled(e.map(e=>I._fetchNetworkImage(e)))},async fetchConnectorImages(){let{connectors:e}=B.state,t=e.map(({imageId:e})=>e).filter(Boolean);await Promise.allSettled(t.map(e=>I._fetchConnectorImage(e)))},async fetchCurrencyImages(e=[]){await Promise.allSettled(e.map(e=>I._fetchCurrencyImage(e)))},async fetchTokenImages(e=[]){await Promise.allSettled(e.map(e=>I._fetchTokenImage(e)))},async fetchWallets(e){let t=e.exclude??[];I._getSdkProperties().sv.startsWith(`html-core-`)&&t.push(...Object.values(k).map(e=>e.id));let n=await P.get({path:`/getWallets`,params:{...I._getSdkProperties(),...e,page:String(e.page),entries:String(e.entries),include:e.include?.join(`,`),exclude:t.join(`,`)}});return{data:I._filterWalletsByPlatform(n?.data)||[],count:n?.count}},async fetchFeaturedWallets(){let{featuredWalletIds:e}=D.state;if(e?.length){let t={...I._getSdkProperties(),page:1,entries:e?.length??Xe,include:e},{data:n}=await I.fetchWallets(t),r=[...n].sort((t,n)=>e.indexOf(t.id)-e.indexOf(n.id)),i=r.map(e=>e.image_id).filter(Boolean);await Promise.allSettled(i.map(e=>I._fetchWalletImage(e))),F.featured=r,F.allFeatured=r}},async fetchRecommendedWallets(){try{F.isFetchingRecommendedWallets=!0;let{includeWalletIds:e,excludeWalletIds:t,featuredWalletIds:n}=D.state,r={page:1,entries:Xe,include:e,exclude:[...t??[],...n??[]].filter(Boolean),chains:J.getRequestedCaipNetworkIds().join(`,`)},{data:i,count:a}=await I.fetchWallets(r),o=w.getRecentWallets(),s=i.map(e=>e.image_id).filter(Boolean),c=o.map(e=>e.image_id).filter(Boolean);await Promise.allSettled([...s,...c].map(e=>I._fetchWalletImage(e))),F.recommended=i,F.allRecommended=i,F.count=a??0}catch{}finally{F.isFetchingRecommendedWallets=!1}},async fetchWalletsByPage({page:e}){let{includeWalletIds:t,excludeWalletIds:n,featuredWalletIds:r}=D.state,i=J.getRequestedCaipNetworkIds().join(`,`),a={page:e,entries:Ye,include:t,exclude:[...F.recommended.map(({id:e})=>e),...n??[],...r??[]].filter(Boolean),chains:i},{data:o,count:s}=await I.fetchWallets(a),c=o.slice(0,Ze).map(e=>e.image_id).filter(Boolean);await Promise.allSettled(c.map(e=>I._fetchWalletImage(e))),F.wallets=T.uniqueBy([...F.wallets,...I._filterOutExtensions(o)],`id`).filter(e=>e.chains?.some(e=>i.includes(e))),F.count=s>F.count?s:F.count,F.page=e},async initializeExcludedWallets({ids:e}){let t={page:1,entries:e.length,include:e},{data:n}=await I.fetchWallets(t);n&&n.forEach(e=>{F.excludedWallets.push({rdns:e.rdns,name:e.name})})},async searchWallet({search:e,badge:t}){let{includeWalletIds:n,excludeWalletIds:r}=D.state,i=J.getRequestedCaipNetworkIds().join(`,`);F.search=[];let a={page:1,entries:100,search:e?.trim(),badge_type:t,include:n,exclude:r,chains:i},{data:o}=await I.fetchWallets(a);N.sendEvent({type:`track`,event:`SEARCH_WALLET`,properties:{badge:t??``,search:e??``}});let s=o.map(e=>e.image_id).filter(Boolean);await Promise.allSettled([...s.map(e=>I._fetchWalletImage(e)),T.wait(300)]),F.search=I._filterOutExtensions(o)},initPromise(e,t){return F.promises[e]||(F.promises[e]=t())},prefetch({fetchConnectorImages:e=!0,fetchFeaturedWallets:t=!0,fetchRecommendedWallets:n=!0,fetchNetworkImages:r=!0}={}){let i=[e&&I.initPromise(`connectorImages`,I.fetchConnectorImages),t&&I.initPromise(`featuredWallets`,I.fetchFeaturedWallets),n&&I.initPromise(`recommendedWallets`,I.fetchRecommendedWallets),r&&I.initPromise(`networkImages`,I.fetchNetworkImages)].filter(Boolean);return Promise.allSettled(i)},prefetchAnalyticsConfig(){D.state.features?.analytics&&I.fetchAnalyticsConfig()},async fetchAnalyticsConfig(){try{let{isAnalyticsEnabled:e}=await P.get({path:`/getAnalyticsConfig`,params:I._getSdkProperties()});D.setFeatures({analytics:e})}catch{D.setFeatures({analytics:!1})}},filterByNamespaces(e){if(!e?.length){F.featured=F.allFeatured,F.recommended=F.allRecommended;return}let t=J.getRequestedCaipNetworkIds().join(`,`);F.featured=F.allFeatured.filter(e=>e.chains?.some(e=>t.includes(e))),F.recommended=F.allRecommended.filter(e=>e.chains?.some(e=>t.includes(e))),F.filteredWallets=F.wallets.filter(e=>e.chains?.some(e=>t.includes(e)))},clearFilterByNamespaces(){F.filteredWallets=[]},setFilterByNamespace(e){if(!e){F.featured=F.allFeatured,F.recommended=F.allRecommended;return}let t=J.getRequestedCaipNetworkIds().join(`,`);F.featured=F.allFeatured.filter(e=>e.chains?.some(e=>t.includes(e))),F.recommended=F.allRecommended.filter(e=>e.chains?.some(e=>t.includes(e))),F.filteredWallets=F.wallets.filter(e=>e.chains?.some(e=>t.includes(e)))}},L=f({view:`Connect`,history:[`Connect`],transactionStack:[]}),R=O({state:L,subscribeKey(e,t){return g(L,e,t)},pushTransactionStack(e){L.transactionStack.push(e)},popTransactionStack(e){let t=L.transactionStack.pop();if(!t)return;let{onSuccess:n,onError:r,onCancel:i}=t;switch(e){case`success`:n?.();break;case`error`:r?.(),R.goBack();break;case`cancel`:i?.(),R.goBack()}},push(e,t){e!==L.view&&(L.view=e,L.history.push(e),L.data=t)},reset(e,t){L.view=e,L.history=[e],L.data=t},replace(e,t){L.history.at(-1)!==e&&(L.view=e,L.history[L.history.length-1]=e,L.data=t)},goBack(){let e=J.state.activeCaipAddress,t=R.state.view===`ConnectingFarcaster`,n=!e&&t;if(L.history.length>1){L.history.pop();let[t]=L.history.slice(-1);t&&(L.view=e&&t===`Connect`?`Account`:t)}else xt.close();L.data?.wallet&&(L.data.wallet=void 0),setTimeout(()=>{if(n){Q.setFarcasterUrl(void 0,J.state.activeChain);let e=B.getAuthConnector();e?.provider?.reload();let t=m(D.state);e?.provider?.syncDappData?.({metadata:t.metadata,sdkVersion:t.sdkVersion,projectId:t.projectId,sdkType:t.sdkType})}},100)},goBackToIndex(e){if(L.history.length>1){L.history=L.history.slice(0,e+1);let[t]=L.history.slice(-1);t&&(L.view=t)}},goBackOrCloseModal(){R.state.history.length>1?R.goBack():xt.close()}}),Qe=f({themeMode:`dark`,themeVariables:{},w3mThemeVariables:void 0}),$e={state:Qe,subscribe(e){return p(Qe,()=>e(Qe))},setThemeMode(e){Qe.themeMode=e;try{let t=B.getAuthConnector();if(t){let n=$e.getSnapshot().themeVariables;t.provider.syncTheme({themeMode:e,themeVariables:n,w3mThemeVariables:Ee(n,e)})}}catch{console.info(`Unable to sync theme to auth connector`)}},setThemeVariables(e){Qe.themeVariables={...Qe.themeVariables,...e};try{let e=B.getAuthConnector();if(e){let t=$e.getSnapshot().themeVariables;e.provider.syncTheme({themeVariables:t,w3mThemeVariables:Ee(Qe.themeVariables,Qe.themeMode)})}}catch{console.info(`Unable to sync theme to auth connector`)}},getSnapshot(){return m(Qe)}},et=O($e),tt={eip155:void 0,solana:void 0,polkadot:void 0,bip122:void 0,cosmos:void 0},z=f({allConnectors:[],connectors:[],activeConnector:void 0,filterByNamespace:void 0,activeConnectorIds:{...tt},filterByNamespaceMap:{eip155:!0,solana:!0,polkadot:!0,bip122:!0,cosmos:!0}}),B=O({state:z,subscribe(e){return p(z,()=>{e(z)})},subscribeKey(e,t){return g(z,e,t)},initialize(e){e.forEach(e=>{let t=w.getConnectedConnectorId(e);t&&B.setConnectorId(t,e)})},setActiveConnector(e){e&&(z.activeConnector=h(e))},setConnectors(e){e.filter(e=>!z.allConnectors.some(t=>t.id===e.id&&B.getConnectorName(t.name)===B.getConnectorName(e.name)&&t.chain===e.chain)).forEach(e=>{e.type!==`MULTI_CHAIN`&&z.allConnectors.push(h(e))});let t=B.getEnabledNamespaces(),n=B.getEnabledConnectors(t);z.connectors=B.mergeMultiChainConnectors(n)},filterByNamespaces(e){Object.keys(z.filterByNamespaceMap).forEach(e=>{z.filterByNamespaceMap[e]=!1}),e.forEach(e=>{z.filterByNamespaceMap[e]=!0}),B.updateConnectorsForEnabledNamespaces()},filterByNamespace(e,t){z.filterByNamespaceMap[e]=t,B.updateConnectorsForEnabledNamespaces()},updateConnectorsForEnabledNamespaces(){let e=B.getEnabledNamespaces(),t=B.getEnabledConnectors(e),n=B.areAllNamespacesEnabled();z.connectors=B.mergeMultiChainConnectors(t),n?I.clearFilterByNamespaces():I.filterByNamespaces(e)},getEnabledNamespaces(){return Object.entries(z.filterByNamespaceMap).filter(([e,t])=>t).map(([e])=>e)},getEnabledConnectors(e){return z.allConnectors.filter(t=>e.includes(t.chain))},areAllNamespacesEnabled(){return Object.values(z.filterByNamespaceMap).every(e=>e)},mergeMultiChainConnectors(e){let t=B.generateConnectorMapByName(e),n=[];return t.forEach(e=>{let t=e[0],r=t?.id===_.CONNECTOR_ID.AUTH;e.length>1&&t?n.push({name:t.name,imageUrl:t.imageUrl,imageId:t.imageId,connectors:[...e],type:r?`AUTH`:`MULTI_CHAIN`,chain:`eip155`,id:t?.id||``}):t&&n.push(t)}),n},generateConnectorMapByName(e){let t=new Map;return e.forEach(e=>{let{name:n}=e,r=B.getConnectorName(n);if(!r)return;let i=t.get(r)||[];i.find(t=>t.chain===e.chain)||i.push(e),t.set(r,i)}),t},getConnectorName(e){return e&&({"Trust Wallet":`Trust`}[e]||e)},getUniqueConnectorsByName(e){let t=[];return e.forEach(e=>{t.find(t=>t.chain===e.chain)||t.push(e)}),t},addConnector(e){if(e.id===_.CONNECTOR_ID.AUTH){let t=e,n=m(D.state),r=et.getSnapshot().themeMode,i=et.getSnapshot().themeVariables;t?.provider?.syncDappData?.({metadata:n.metadata,sdkVersion:n.sdkVersion,projectId:n.projectId,sdkType:n.sdkType}),t?.provider?.syncTheme({themeMode:r,themeVariables:i,w3mThemeVariables:Ee(i,r)}),B.setConnectors([e])}else B.setConnectors([e])},getAuthConnector(e){let t=e||J.state.activeChain,n=z.connectors.find(e=>e.id===_.CONNECTOR_ID.AUTH);if(n)return n?.connectors?.length?n.connectors.find(e=>e.chain===t):n},getAnnouncedConnectorRdns(){return z.connectors.filter(e=>e.type===`ANNOUNCED`).map(e=>e.info?.rdns)},getConnectorById(e){return z.allConnectors.find(t=>t.id===e)},getConnector(e,t){return z.allConnectors.filter(e=>e.chain===J.state.activeChain).find(n=>n.explorerId===e||n.info?.rdns===t)},syncIfAuthConnector(e){if(e.id!==`ID_AUTH`)return;let t=e,n=m(D.state),r=et.getSnapshot().themeMode,i=et.getSnapshot().themeVariables;t?.provider?.syncDappData?.({metadata:n.metadata,sdkVersion:n.sdkVersion,sdkType:n.sdkType,projectId:n.projectId}),t.provider.syncTheme({themeMode:r,themeVariables:i,w3mThemeVariables:Ee(i,r)})},getConnectorsByNamespace(e){let t=z.allConnectors.filter(t=>t.chain===e);return B.mergeMultiChainConnectors(t)},selectWalletConnector(e){let t=B.getConnector(e.id,e.rdns),n=J.state.activeChain;Ve.handleMobileDeeplinkRedirect(t?.explorerId||e.id,n),t?R.push(`ConnectingExternal`,{connector:t}):R.push(`ConnectingWalletConnect`,{wallet:e})},getConnectors(e){return e?B.getConnectorsByNamespace(e):B.mergeMultiChainConnectors(z.allConnectors)},setFilterByNamespace(e){z.filterByNamespace=e,z.connectors=B.getConnectors(e),I.setFilterByNamespace(e)},setConnectorId(e,t){e&&(z.activeConnectorIds={...z.activeConnectorIds,[t]:e},w.setConnectedConnectorId(t,e))},removeConnectorId(e){z.activeConnectorIds={...z.activeConnectorIds,[e]:void 0},w.deleteConnectedConnectorId(e)},getConnectorId(e){if(e)return z.activeConnectorIds[e]},isConnected(e){return e?!!z.activeConnectorIds[e]:Object.values(z.activeConnectorIds).some(e=>!!e)},resetConnectorIds(){z.activeConnectorIds={...tt}}});typeof process<`u`&&{}.NEXT_PUBLIC_SECURE_SITE_SDK_URL,typeof process<`u`&&{}.NEXT_PUBLIC_DEFAULT_LOG_LEVEL,typeof process<`u`&&{}.NEXT_PUBLIC_SECURE_SITE_SDK_VERSION;var nt={SAFE_RPC_METHODS:`eth_accounts.eth_blockNumber.eth_call.eth_chainId.eth_estimateGas.eth_feeHistory.eth_gasPrice.eth_getAccount.eth_getBalance.eth_getBlockByHash.eth_getBlockByNumber.eth_getBlockReceipts.eth_getBlockTransactionCountByHash.eth_getBlockTransactionCountByNumber.eth_getCode.eth_getFilterChanges.eth_getFilterLogs.eth_getLogs.eth_getProof.eth_getStorageAt.eth_getTransactionByBlockHashAndIndex.eth_getTransactionByBlockNumberAndIndex.eth_getTransactionByHash.eth_getTransactionCount.eth_getTransactionReceipt.eth_getUncleCountByBlockHash.eth_getUncleCountByBlockNumber.eth_maxPriorityFeePerGas.eth_newBlockFilter.eth_newFilter.eth_newPendingTransactionFilter.eth_sendRawTransaction.eth_syncing.eth_uninstallFilter.wallet_getCapabilities.wallet_getCallsStatus.eth_getUserOperationReceipt.eth_estimateUserOperationGas.eth_getUserOperationByHash.eth_supportedEntryPoints.wallet_getAssets`.split(`.`),NOT_SAFE_RPC_METHODS:[`personal_sign`,`eth_signTypedData_v4`,`eth_sendTransaction`,`solana_signMessage`,`solana_signTransaction`,`solana_signAllTransactions`,`solana_signAndSendTransaction`,`wallet_sendCalls`,`wallet_grantPermissions`,`wallet_revokePermissions`,`eth_sendUserOperation`],GET_CHAIN_ID:`eth_chainId`,RPC_METHOD_NOT_ALLOWED_MESSAGE:`Requested RPC call is not allowed`,RPC_METHOD_NOT_ALLOWED_UI_MESSAGE:`Action not allowed`,ACCOUNT_TYPES:{EOA:`eoa`,SMART_ACCOUNT:`smartAccount`}},rt=Object.freeze({message:``,variant:`success`,svg:void 0,open:!1,autoClose:!0}),V=f({...rt}),it={state:V,subscribeKey(e,t){return g(V,e,t)},showLoading(e,t={}){this._showMessage({message:e,variant:`loading`,...t})},showSuccess(e){this._showMessage({message:e,variant:`success`})},showSvg(e,t){this._showMessage({message:e,svg:t})},showError(e){let t=T.parseError(e);this._showMessage({message:t,variant:`error`})},hide(){V.message=rt.message,V.variant=rt.variant,V.svg=rt.svg,V.open=rt.open,V.autoClose=rt.autoClose},_showMessage({message:e,svg:t,variant:n=`success`,autoClose:r=rt.autoClose}){V.open?(V.open=!1,setTimeout(()=>{V.message=e,V.variant=n,V.svg=t,V.open=!0,V.autoClose=r},150)):(V.message=e,V.variant=n,V.svg=t,V.open=!0,V.autoClose=r)}},H=f({transactions:[],coinbaseTransactions:{},transactionsByYear:{},lastNetworkInView:void 0,loading:!1,empty:!1,next:void 0}),at=O({state:H,subscribe(e){return p(H,()=>e(H))},setLastNetworkInView(e){H.lastNetworkInView=e},async fetchTransactions(e,t){if(!e)throw Error(`Transactions can't be fetched without an accountAddress`);H.loading=!0;try{let n=await X.fetchTransactions({account:e,cursor:H.next,onramp:t,cache:t===`coinbase`?`no-cache`:void 0,chainId:J.state.activeCaipNetwork?.caipNetworkId}),r=at.filterSpamTransactions(n.data),i=at.filterByConnectedChain(r),a=[...H.transactions,...i];H.loading=!1,t===`coinbase`?H.coinbaseTransactions=at.groupTransactionsByYearAndMonth(H.coinbaseTransactions,n.data):(H.transactions=a,H.transactionsByYear=at.groupTransactionsByYearAndMonth(H.transactionsByYear,i)),H.empty=a.length===0,H.next=n.next?n.next:void 0}catch{let t=J.state.activeChain;N.sendEvent({type:`track`,event:`ERROR_FETCH_TRANSACTIONS`,properties:{address:e,projectId:D.state.projectId,cursor:H.next,isSmartAccount:Q.state.preferredAccountTypes?.[t]===nt.ACCOUNT_TYPES.SMART_ACCOUNT}}),it.showError(`Failed to fetch transactions`),H.loading=!1,H.empty=!0,H.next=void 0}},groupTransactionsByYearAndMonth(e={},t=[]){let n=e;return t.forEach(e=>{let t=new Date(e.metadata.minedAt).getFullYear(),r=new Date(e.metadata.minedAt).getMonth(),i=n[t]??{},a=(i[r]??[]).filter(t=>t.id!==e.id);n[t]={...i,[r]:[...a,e].sort((e,t)=>new Date(t.metadata.minedAt).getTime()-new Date(e.metadata.minedAt).getTime())}}),n},filterSpamTransactions(e){return e.filter(e=>!e.transfers.every(e=>e.nft_info?.flags.is_spam===!0))},filterByConnectedChain(e){let t=J.state.activeCaipNetwork?.caipNetworkId;return e.filter(e=>e.metadata.chain===t)},clearCursor(){H.next=void 0},resetTransactions(){H.transactions=[],H.transactionsByYear={},H.lastNetworkInView=void 0,H.loading=!1,H.empty=!1,H.next=void 0}},`API_ERROR`),U=f({connections:new Map,wcError:!1,buffering:!1,status:`disconnected`}),ot,W=O({state:U,subscribeKey(e,t){return g(U,e,t)},_getClient(){return U._client},setClient(e){U._client=h(e)},async connectWalletConnect(){if(T.isTelegram()||T.isSafari()&&T.isIos()){if(ot){await ot,ot=void 0;return}if(!T.isPairingExpired(U?.wcPairingExpiry)){U.wcUri=U.wcUri;return}ot=W._getClient()?.connectWalletConnect?.().catch(()=>void 0),W.state.status=`connecting`,await ot,ot=void 0,U.wcPairingExpiry=void 0,W.state.status=`connected`}else await W._getClient()?.connectWalletConnect?.()},async connectExternal(e,t,n=!0){await W._getClient()?.connectExternal?.(e),n&&J.setActiveNamespace(t)},async reconnectExternal(e){await W._getClient()?.reconnectExternal?.(e);let t=e.chain||J.state.activeChain;t&&B.setConnectorId(e.id,t)},async setPreferredAccountType(e,t){xt.setLoading(!0,J.state.activeChain);let n=B.getAuthConnector();n&&(Q.setPreferredAccountType(e,t),await n.provider.setPreferredAccount(e),w.setPreferredAccountTypes(Q.state.preferredAccountTypes??{[t]:e}),await W.reconnectExternal(n),xt.setLoading(!1,J.state.activeChain),N.sendEvent({type:`track`,event:`SET_PREFERRED_ACCOUNT_TYPE`,properties:{accountType:e,network:J.state.activeCaipNetwork?.caipNetworkId||``}}))},async signMessage(e){return W._getClient()?.signMessage(e)},parseUnits(e,t){return W._getClient()?.parseUnits(e,t)},formatUnits(e,t){return W._getClient()?.formatUnits(e,t)},async sendTransaction(e){return W._getClient()?.sendTransaction(e)},async getCapabilities(e){return W._getClient()?.getCapabilities(e)},async grantPermissions(e){return W._getClient()?.grantPermissions(e)},async walletGetAssets(e){return W._getClient()?.walletGetAssets(e)??{}},async estimateGas(e){return W._getClient()?.estimateGas(e)},async writeContract(e){return W._getClient()?.writeContract(e)},async getEnsAddress(e){return W._getClient()?.getEnsAddress(e)},async getEnsAvatar(e){return W._getClient()?.getEnsAvatar(e)},checkInstalled(e){return W._getClient()?.checkInstalled?.(e)||!1},resetWcConnection(){U.wcUri=void 0,U.wcPairingExpiry=void 0,U.wcLinking=void 0,U.recentWallet=void 0,U.status=`disconnected`,at.resetTransactions(),w.deleteWalletConnectDeepLink()},resetUri(){U.wcUri=void 0,U.wcPairingExpiry=void 0,ot=void 0},finalizeWcConnection(){let{wcLinking:e,recentWallet:t}=W.state;e&&w.setWalletConnectDeepLink(e),t&&w.setAppKitRecent(t),N.sendEvent({type:`track`,event:`CONNECT_SUCCESS`,properties:{method:e?`mobile`:`qrcode`,name:R.state.data?.wallet?.name||`Unknown`}})},setWcBasic(e){U.wcBasic=e},setUri(e){U.wcUri=e,U.wcPairingExpiry=T.getPairingExpiry()},setWcLinking(e){U.wcLinking=e},setWcError(e){U.wcError=e,U.buffering=!1},setRecentWallet(e){U.recentWallet=e},setBuffering(e){U.buffering=e},setStatus(e){U.status=e},async disconnect(e){try{await W._getClient()?.disconnect(e)}catch(e){throw new ze(`Failed to disconnect`,`INTERNAL_SDK_ERROR`,e)}},setConnections(e,t){U.connections.set(t,e)},switchAccount({connection:e,address:t,namespace:n}){if(B.state.activeConnectorIds[n]===e.connectorId){let e=J.state.activeCaipNetwork;if(e){let r=`${n}:${e.id}:${t}`;Q.setCaipAddress(r,n)}else console.warn(`No current network found for namespace "${n}"`)}else{let t=B.getConnector(e.connectorId);t?W.connectExternal(t,n):console.warn(`No connector found for namespace "${n}"`)}}}),st=f({loading:!1,open:!1,selectedNetworkId:void 0,activeChain:void 0,initialized:!1}),ct={state:st,subscribe(e){return p(st,()=>e(st))},subscribeOpen(e){return g(st,`open`,e)},set(e){Object.assign(st,{...st,...e})}},lt={wei:0,gwei:9,szabo:12,finney:15,ether:18};function ut(e,t=0){if(!Number.isInteger(t)||t<0)throw new ft({decimals:t});let n=e.toString(),r=n.startsWith(`-`);r&&(n=n.slice(1)),n=n.padStart(t,`0`);let[i,a]=[n.slice(0,n.length-t),n.slice(n.length-t)];return a=a.replace(/(0+)$/,``),`${r?`-`:``}${i||`0`}${a?`.${a}`:``}`}function dt(e,t=`wei`){return ut(e,lt.gwei-lt[t])}var ft=class extends Error{constructor({decimals:e}){super(`\`decimals\` must be a non-negative integer. Got \`${e}\`.`),Object.defineProperty(this,"name",{enumerable:!0,configurable:!0,writable:!0,value:`Value.InvalidDecimalsError`})}};function pt(e,t){return ut(e,t)}var mt={createBalance(e,t){let n={name:e.metadata.name||``,symbol:e.metadata.symbol||``,decimals:e.metadata.decimals||0,value:e.metadata.value||0,price:e.metadata.price||0,iconUrl:e.metadata.iconUrl||``};return{name:n.name,symbol:n.symbol,chainId:t,address:e.address===`native`?void 0:this.convertAddressToCAIP10Address(e.address,t),value:n.value,price:n.price,quantity:{decimals:n.decimals.toString(),numeric:this.convertHexToBalance({hex:e.balance,decimals:n.decimals})},iconUrl:n.iconUrl}},convertHexToBalance({hex:e,decimals:t}){return pt(BigInt(e),t)},convertAddressToCAIP10Address(e,t){return`${t}:${e}`},createCAIP2ChainId(e,t){return`${t}:${parseInt(e,16)}`},getChainIdHexFromCAIP2ChainId(e){let t=e.split(`:`);if(t.length<2||!t[1])return`0x0`;let n=t[1],r=parseInt(n,10);return isNaN(r)?`0x0`:`0x${r.toString(16)}`},isWalletGetAssetsResponse(e){return typeof e!=`object`||!e?!1:Object.values(e).every(e=>Array.isArray(e)&&e.every(e=>this.isValidAsset(e)))},isValidAsset(e){return typeof e==`object`&&!!e&&typeof e.address==`string`&&typeof e.balance==`string`&&(e.type===`ERC20`||e.type===`NATIVE`)&&typeof e.metadata==`object`&&e.metadata!==null&&typeof e.metadata.name==`string`&&typeof e.metadata.symbol==`string`&&typeof e.metadata.decimals==`number`&&typeof e.metadata.price==`number`&&typeof e.metadata.iconUrl==`string`}},ht={async getMyTokensWithBalance(e){let t=Q.state.address,n=J.state.activeCaipNetwork;if(!t||!n)return[];if(n.chainNamespace===`eip155`){let e=await this.getEIP155Balances(t,n);if(e)return this.filterLowQualityTokens(e)}let r=await X.getBalance(t,n.caipNetworkId,e);return this.filterLowQualityTokens(r.balances)},async getEIP155Balances(e,t){try{let n=mt.getChainIdHexFromCAIP2ChainId(t.caipNetworkId);if(!(await W.getCapabilities(e))?.[n]?.assetDiscovery?.supported)return null;let r=await W.walletGetAssets({account:e,chainFilter:[n]});return mt.isWalletGetAssetsResponse(r)?(r[n]||[]).map(e=>mt.createBalance(e,t.caipNetworkId)):null}catch{return null}},filterLowQualityTokens(e){return e.filter(e=>e.quantity.decimals!==`0`)},mapBalancesToSwapTokens(e){return e?.map(e=>({...e,address:e?.address?e.address:J.getActiveNetworkTokenAddress(),decimals:parseInt(e.quantity.decimals,10),logoUri:e.iconUrl,eip2612:!1}))||[]}},G=f({tokenBalances:[],loading:!1}),K=O({state:G,subscribe(e){return p(G,()=>e(G))},subscribeKey(e,t){return g(G,e,t)},setToken(e){e&&(G.token=h(e))},setTokenAmount(e){G.sendTokenAmount=e},setReceiverAddress(e){G.receiverAddress=e},setReceiverProfileImageUrl(e){G.receiverProfileImageUrl=e},setReceiverProfileName(e){G.receiverProfileName=e},setNetworkBalanceInUsd(e){G.networkBalanceInUSD=e},setLoading(e){G.loading=e},async sendToken(){try{switch(K.setLoading(!0),J.state.activeCaipNetwork?.chainNamespace){case`eip155`:await K.sendEvmToken();return;case`solana`:await K.sendSolanaToken();return;default:throw Error(`Unsupported chain`)}}finally{K.setLoading(!1)}},async sendEvmToken(){let e=J.state.activeChain,t=Q.state.preferredAccountTypes?.[e];if(!K.state.sendTokenAmount||!K.state.receiverAddress)throw Error(`An amount and receiver address are required`);if(!K.state.token)throw Error(`A token is required`);K.state.token?.address?(N.sendEvent({type:`track`,event:`SEND_INITIATED`,properties:{isSmartAccount:t===nt.ACCOUNT_TYPES.SMART_ACCOUNT,token:K.state.token.address,amount:K.state.sendTokenAmount,network:J.state.activeCaipNetwork?.caipNetworkId||``}}),await K.sendERC20Token({receiverAddress:K.state.receiverAddress,tokenAddress:K.state.token.address,sendTokenAmount:K.state.sendTokenAmount,decimals:K.state.token.quantity.decimals})):(N.sendEvent({type:`track`,event:`SEND_INITIATED`,properties:{isSmartAccount:t===nt.ACCOUNT_TYPES.SMART_ACCOUNT,token:K.state.token.symbol||``,amount:K.state.sendTokenAmount,network:J.state.activeCaipNetwork?.caipNetworkId||``}}),await K.sendNativeToken({receiverAddress:K.state.receiverAddress,sendTokenAmount:K.state.sendTokenAmount,decimals:K.state.token.quantity.decimals}))},async fetchTokenBalance(e){G.loading=!0;let t=J.state.activeCaipNetwork?.caipNetworkId,n=J.state.activeCaipNetwork?.chainNamespace,r=J.state.activeCaipAddress,i=r?T.getPlainAddress(r):void 0;if(G.lastRetry&&!T.isAllowedRetry(G.lastRetry,30*C.ONE_SEC_MS))return G.loading=!1,[];try{if(i&&t&&n){let e=await ht.getMyTokensWithBalance();return G.tokenBalances=e,G.lastRetry=void 0,e}}catch(t){G.lastRetry=Date.now(),e?.(t),it.showError(`Token Balance Unavailable`)}finally{G.loading=!1}return[]},fetchNetworkBalance(){if(G.tokenBalances.length===0)return;let e=ht.mapBalancesToSwapTokens(G.tokenBalances);if(!e)return;let t=e.find(e=>e.address===J.getActiveNetworkTokenAddress());t&&(G.networkBalanceInUSD=t?ye.multiply(t.quantity.numeric,t.price).toString():`0`)},async sendNativeToken(e){R.pushTransactionStack({});let t=e.receiverAddress,n=Q.state.address,r=W.parseUnits(e.sendTokenAmount.toString(),Number(e.decimals));await W.sendTransaction({chainNamespace:`eip155`,to:t,address:n,data:`0x`,value:r??BigInt(0)}),N.sendEvent({type:`track`,event:`SEND_SUCCESS`,properties:{isSmartAccount:Q.state.preferredAccountTypes?.eip155===nt.ACCOUNT_TYPES.SMART_ACCOUNT,token:K.state.token?.symbol||``,amount:e.sendTokenAmount,network:J.state.activeCaipNetwork?.caipNetworkId||``}}),W._getClient()?.updateBalance(`eip155`),K.resetSend()},async sendERC20Token(e){R.pushTransactionStack({onSuccess(){R.replace(`Account`)}});let t=W.parseUnits(e.sendTokenAmount.toString(),Number(e.decimals));if(Q.state.address&&e.sendTokenAmount&&e.receiverAddress&&e.tokenAddress){let n=T.getPlainAddress(e.tokenAddress);await W.writeContract({fromAddress:Q.state.address,tokenAddress:n,args:[e.receiverAddress,t??BigInt(0)],method:`transfer`,abi:Ce.getERC20Abi(n),chainNamespace:`eip155`}),K.resetSend()}},async sendSolanaToken(){if(!K.state.sendTokenAmount||!K.state.receiverAddress)throw Error(`An amount and receiver address are required`);R.pushTransactionStack({onSuccess(){R.replace(`Account`)}}),await W.sendTransaction({chainNamespace:`solana`,to:K.state.receiverAddress,value:K.state.sendTokenAmount}),W._getClient()?.updateBalance(`solana`),K.resetSend()},resetSend(){G.token=void 0,G.sendTokenAmount=void 0,G.receiverAddress=void 0,G.receiverProfileImageUrl=void 0,G.receiverProfileName=void 0,G.loading=!1,G.tokenBalances=[]}}),gt={currentTab:0,tokenBalance:[],smartAccountDeployed:!1,addressLabels:new Map,allAccounts:[],user:void 0},_t={caipNetwork:void 0,supportsAllNetworks:!0,smartAccountEnabledNetworks:[]},q=f({chains:ee(),activeCaipAddress:void 0,activeChain:void 0,activeCaipNetwork:void 0,noAdapters:!1,universalAdapter:{networkControllerClient:void 0,connectionControllerClient:void 0},isSwitchingNamespace:!1}),J=O({state:q,subscribe(e){return p(q,()=>{e(q)})},subscribeKey(e,t){return g(q,e,t)},subscribeChainProp(e,t,n){let r;return p(q.chains,()=>{let i=n||q.activeChain;if(i){let n=q.chains.get(i)?.[e];r!==n&&(r=n,t(n))}})},initialize(e,t,n){let{chainId:r,namespace:i}=w.getActiveNetworkProps(),a=t?.find(e=>e.id.toString()===r?.toString()),o=e.find(e=>e?.namespace===i)||e?.[0],s=e.map(e=>e.namespace).filter(e=>e!==void 0),c=D.state.enableEmbedded?new Set([...s]):new Set([...t?.map(e=>e.chainNamespace)??[]]);e?.length!==0&&o||(q.noAdapters=!0),q.noAdapters||(q.activeChain=o?.namespace,q.activeCaipNetwork=a,J.setChainNetworkData(o?.namespace,{caipNetwork:a}),q.activeChain&&ct.set({activeChain:o?.namespace})),c.forEach(e=>{let r=t?.filter(t=>t.chainNamespace===e);J.state.chains.set(e,{namespace:e,networkState:f({..._t,caipNetwork:r?.[0]}),accountState:f(gt),caipNetworks:r??[],...n}),J.setRequestedCaipNetworks(r??[],e)})},removeAdapter(e){if(q.activeChain===e){let t=Array.from(q.chains.entries()).find(([t])=>t!==e);if(t){let e=t[1]?.caipNetworks?.[0];e&&J.setActiveCaipNetwork(e)}}q.chains.delete(e)},addAdapter(e,{networkControllerClient:t,connectionControllerClient:n},r){q.chains.set(e.namespace,{namespace:e.namespace,networkState:{..._t,caipNetwork:r[0]},accountState:gt,caipNetworks:r,connectionControllerClient:n,networkControllerClient:t}),J.setRequestedCaipNetworks(r?.filter(t=>t.chainNamespace===e.namespace)??[],e.namespace)},addNetwork(e){let t=q.chains.get(e.chainNamespace);if(t){let n=[...t.caipNetworks||[]];t.caipNetworks?.find(t=>t.id===e.id)||n.push(e),q.chains.set(e.chainNamespace,{...t,caipNetworks:n}),J.setRequestedCaipNetworks(n,e.chainNamespace),B.filterByNamespace(e.chainNamespace,!0)}},removeNetwork(e,t){let n=q.chains.get(e);if(n){let r=q.activeCaipNetwork?.id===t,i=[...n.caipNetworks?.filter(e=>e.id!==t)||[]];r&&n?.caipNetworks?.[0]&&J.setActiveCaipNetwork(n.caipNetworks[0]),q.chains.set(e,{...n,caipNetworks:i}),J.setRequestedCaipNetworks(i||[],e),i.length===0&&B.filterByNamespace(e,!1)}},setAdapterNetworkState(e,t){let n=q.chains.get(e);n&&(n.networkState={...n.networkState||_t,...t},q.chains.set(e,n))},setChainAccountData(e,t,n=!0){if(!e)throw Error(`Chain is required to update chain account data`);let r=q.chains.get(e);if(r){let n={...r.accountState||gt,...t};q.chains.set(e,{...r,accountState:n}),(q.chains.size===1||q.activeChain===e)&&(t.caipAddress&&(q.activeCaipAddress=t.caipAddress),Q.replaceState(n))}},setChainNetworkData(e,t){if(!e)return;let n=q.chains.get(e);if(n){let r={...n.networkState||_t,...t};q.chains.set(e,{...n,networkState:r})}},setAccountProp(e,t,n,r=!0){J.setChainAccountData(n,{[e]:t},r),e===`status`&&t===`disconnected`&&n&&B.removeConnectorId(n)},setActiveNamespace(e){q.activeChain=e;let t=e?q.chains.get(e):void 0,n=t?.networkState?.caipNetwork;n?.id&&e&&(q.activeCaipAddress=t?.accountState?.caipAddress,q.activeCaipNetwork=n,J.setChainNetworkData(e,{caipNetwork:n}),w.setActiveCaipNetworkId(n?.caipNetworkId),ct.set({activeChain:e,selectedNetworkId:n?.caipNetworkId}))},setActiveCaipNetwork(e){if(!e)return;q.activeChain!==e.chainNamespace&&J.setIsSwitchingNamespace(!0);let t=q.chains.get(e.chainNamespace);q.activeChain=e.chainNamespace,q.activeCaipNetwork=e,J.setChainNetworkData(e.chainNamespace,{caipNetwork:e}),q.activeCaipAddress=t?.accountState?.address?`${e.chainNamespace}:${e.id}:${t?.accountState?.address}`:void 0,J.setAccountProp(`caipAddress`,q.activeCaipAddress,e.chainNamespace),t&&Q.replaceState(t.accountState),K.resetSend(),ct.set({activeChain:q.activeChain,selectedNetworkId:q.activeCaipNetwork?.caipNetworkId}),w.setActiveCaipNetworkId(e.caipNetworkId),!J.checkIfSupportedNetwork(e.chainNamespace)&&D.state.enableNetworkSwitch&&!D.state.allowUnsupportedChain&&!W.state.wcBasic&&J.showUnsupportedChainUI()},addCaipNetwork(e){if(!e)return;let t=q.chains.get(e.chainNamespace);t&&t?.caipNetworks?.push(e)},async switchActiveNamespace(e){if(!e)return;let t=e!==J.state.activeChain,n=J.getNetworkData(e)?.caipNetwork,r=J.getCaipNetworkByNamespace(e,n?.id);t&&r&&await J.switchActiveNetwork(r)},async switchActiveNetwork(e){let t=!J.state.chains.get(J.state.activeChain)?.caipNetworks?.some(e=>e.id===q.activeCaipNetwork?.id),n=J.getNetworkControllerClient(e.chainNamespace);if(n){try{await n.switchCaipNetwork(e),t&&xt.close()}catch{R.goBack()}N.sendEvent({type:`track`,event:`SWITCH_NETWORK`,properties:{network:e.caipNetworkId}})}},getNetworkControllerClient(e){let t=e||q.activeChain,n=q.chains.get(t);if(!n)throw Error(`Chain adapter not found`);if(!n.networkControllerClient)throw Error(`NetworkController client not set`);return n.networkControllerClient},getConnectionControllerClient(e){let t=e||q.activeChain;if(!t)throw Error(`Chain is required to get connection controller client`);let n=q.chains.get(t);if(!n?.connectionControllerClient)throw Error(`ConnectionController client not set`);return n.connectionControllerClient},getAccountProp(e,t){let n=q.activeChain;if(t&&(n=t),!n)return;let r=q.chains.get(n)?.accountState;if(r)return r[e]},getNetworkProp(e,t){let n=q.chains.get(t)?.networkState;if(n)return n[e]},getRequestedCaipNetworks(e){let{approvedCaipNetworkIds:t=[],requestedCaipNetworks:n=[]}=q.chains.get(e)?.networkState||{};return T.sortRequestedNetworks(t,n)},getAllRequestedCaipNetworks(){let e=[];return q.chains.forEach(t=>{let n=J.getRequestedCaipNetworks(t.namespace);e.push(...n)}),e},setRequestedCaipNetworks(e,t){J.setAdapterNetworkState(t,{requestedCaipNetworks:e});let n=J.getAllRequestedCaipNetworks().map(e=>e.chainNamespace),r=Array.from(new Set(n));B.filterByNamespaces(r)},getAllApprovedCaipNetworkIds(){let e=[];return q.chains.forEach(t=>{let n=J.getApprovedCaipNetworkIds(t.namespace);e.push(...n)}),e},getActiveCaipNetwork(){return q.activeCaipNetwork},getActiveCaipAddress(){return q.activeCaipAddress},getApprovedCaipNetworkIds(e){return q.chains.get(e)?.networkState?.approvedCaipNetworkIds||[]},async setApprovedCaipNetworksData(e){let t=await J.getNetworkControllerClient()?.getApprovedCaipNetworksData();J.setAdapterNetworkState(e,{approvedCaipNetworkIds:t?.approvedCaipNetworkIds,supportsAllNetworks:t?.supportsAllNetworks})},checkIfSupportedNetwork(e,t){let n=t||q.activeCaipNetwork,r=J.getRequestedCaipNetworks(e);return!r.length||r?.some(e=>e.id===n?.id)},checkIfSupportedChainId(e){return!q.activeChain||J.getRequestedCaipNetworks(q.activeChain)?.some(t=>t.id===e)},setSmartAccountEnabledNetworks(e,t){J.setAdapterNetworkState(t,{smartAccountEnabledNetworks:e})},checkIfSmartAccountEnabled(){let e=v.caipNetworkIdToNumber(q.activeCaipNetwork?.caipNetworkId),t=q.activeChain;return!t||!e?!1:!!J.getNetworkProp(`smartAccountEnabledNetworks`,t)?.includes(Number(e))},getActiveNetworkTokenAddress(){let e=q.activeCaipNetwork?.chainNamespace||`eip155`;return`${e}:${q.activeCaipNetwork?.id||1}:${C.NATIVE_TOKEN_ADDRESS[e]}`},showUnsupportedChainUI(){xt.open({view:`UnsupportedChain`})},checkIfNamesSupported(){let e=q.activeCaipNetwork;return!!(e?.chainNamespace&&C.NAMES_SUPPORTED_CHAIN_NAMESPACES.includes(e.chainNamespace))},resetNetwork(e){J.setAdapterNetworkState(e,{approvedCaipNetworkIds:void 0,supportsAllNetworks:!0,smartAccountEnabledNetworks:[]})},resetAccount(e){let t=e;if(!t)throw Error(`Chain is required to set account prop`);q.activeCaipAddress=void 0,J.setChainAccountData(t,{smartAccountDeployed:!1,currentTab:0,caipAddress:void 0,address:void 0,balance:void 0,balanceSymbol:void 0,profileName:void 0,profileImage:void 0,addressExplorerUrl:void 0,tokenBalance:[],connectedWalletInfo:void 0,preferredAccountTypes:void 0,socialProvider:void 0,socialWindow:void 0,farcasterUrl:void 0,allAccounts:[],user:void 0,status:`disconnected`}),B.removeConnectorId(t)},setIsSwitchingNamespace(e){q.isSwitchingNamespace=e},getFirstCaipNetworkSupportsAuthConnector(){let e=[],t;if(q.chains.forEach(t=>{_.AUTH_CONNECTOR_SUPPORTED_CHAINS.find(e=>e===t.namespace)&&t.namespace&&e.push(t.namespace)}),e.length>0){let n=e[0];return t=n?q.chains.get(n)?.caipNetworks?.[0]:void 0,t}},getAccountData(e){return e?J.state.chains.get(e)?.accountState:Q.state},getNetworkData(e){let t=e||q.activeChain;if(t)return J.state.chains.get(t)?.networkState},getCaipNetworkByNamespace(e,t){if(!e)return;let n=J.state.chains.get(e);return n?.caipNetworks?.find(e=>e.id===t)||n?.networkState?.caipNetwork||n?.caipNetworks?.[0]},getRequestedCaipNetworkIds(){let e=B.state.filterByNamespace;return(e?[q.chains.get(e)]:Array.from(q.chains.values())).flatMap(e=>e?.caipNetworks||[]).map(e=>e.caipNetworkId)},getCaipNetworks(e){return e?J.getRequestedCaipNetworks(e):J.getAllRequestedCaipNetworks()}}),vt={purchaseCurrencies:[{id:`2b92315d-eab7-5bef-84fa-089a131333f5`,name:`USD Coin`,symbol:`USDC`,networks:[{name:`ethereum-mainnet`,display_name:`Ethereum`,chain_id:`1`,contract_address:`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`},{name:`polygon-mainnet`,display_name:`Polygon`,chain_id:`137`,contract_address:`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`}]},{id:`2b92315d-eab7-5bef-84fa-089a131333f5`,name:`Ether`,symbol:`ETH`,networks:[{name:`ethereum-mainnet`,display_name:`Ethereum`,chain_id:`1`,contract_address:`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`},{name:`polygon-mainnet`,display_name:`Polygon`,chain_id:`137`,contract_address:`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`}]}],paymentCurrencies:[{id:`USD`,payment_method_limits:[{id:`card`,min:`10.00`,max:`7500.00`},{id:`ach_bank_account`,min:`10.00`,max:`25000.00`}]},{id:`EUR`,payment_method_limits:[{id:`card`,min:`10.00`,max:`7500.00`},{id:`ach_bank_account`,min:`10.00`,max:`25000.00`}]}]},yt=T.getBlockchainApiUrl(),Y=f({clientId:null,api:new je({baseUrl:yt,clientId:null}),supportedChains:{http:[],ws:[]}}),X={state:Y,async get(e){let{st:t,sv:n}=X.getSdkProperties(),r=D.state.projectId,i={...e.params||{},st:t,sv:n,projectId:r};return Y.api.get({...e,params:i})},getSdkProperties(){let{sdkType:e,sdkVersion:t}=D.state;return{st:e||`unknown`,sv:t||`unknown`}},async isNetworkSupported(e){if(!e)return!1;try{Y.supportedChains.http.length||await X.getSupportedNetworks()}catch{return!1}return Y.supportedChains.http.includes(e)},async getSupportedNetworks(){try{let e=await X.get({path:`v1/supported-chains`});return Y.supportedChains=e,e}catch{return Y.supportedChains}},async fetchIdentity({address:e,caipNetworkId:t}){if(!await X.isNetworkSupported(t))return{avatar:``,name:``};let n=w.getIdentityFromCacheForAddress(e);if(n)return n;let r=await X.get({path:`/v1/identity/${e}`,params:{sender:J.state.activeCaipAddress?T.getPlainAddress(J.state.activeCaipAddress):void 0}});return w.updateIdentityCache({address:e,identity:r,timestamp:Date.now()}),r},async fetchTransactions({account:e,cursor:t,onramp:n,signal:r,cache:i,chainId:a}){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?X.get({path:`/v1/account/${e}/history`,params:{cursor:t,onramp:n,chainId:a},signal:r,cache:i}):{data:[],next:void 0}},async fetchSwapQuote({amount:e,userAddress:t,from:n,to:r,gasPrice:i}){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?X.get({path:`/v1/convert/quotes`,headers:{"Content-Type":`application/json`},params:{amount:e,userAddress:t,from:n,to:r,gasPrice:i}}):{quotes:[]}},async fetchSwapTokens({chainId:e}){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?X.get({path:`/v1/convert/tokens`,params:{chainId:e}}):{tokens:[]}},async fetchTokenPrice({addresses:e}){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?Y.api.post({path:`/v1/fungible/price`,body:{currency:`usd`,addresses:e,projectId:D.state.projectId},headers:{"Content-Type":`application/json`}}):{fungibles:[]}},async fetchSwapAllowance({tokenAddress:e,userAddress:t}){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?X.get({path:`/v1/convert/allowance`,params:{tokenAddress:e,userAddress:t},headers:{"Content-Type":`application/json`}}):{allowance:`0`}},async fetchGasPrice({chainId:e}){let{st:t,sv:n}=X.getSdkProperties();if(!await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId))throw Error(`Network not supported for Gas Price`);return X.get({path:`/v1/convert/gas-price`,headers:{"Content-Type":`application/json`},params:{chainId:e,st:t,sv:n}})},async generateSwapCalldata({amount:e,from:t,to:n,userAddress:r,disableEstimate:i}){if(!await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId))throw Error(`Network not supported for Swaps`);return Y.api.post({path:`/v1/convert/build-transaction`,headers:{"Content-Type":`application/json`},body:{amount:e,eip155:{slippage:C.CONVERT_SLIPPAGE_TOLERANCE},projectId:D.state.projectId,from:t,to:n,userAddress:r,disableEstimate:i}})},async generateApproveCalldata({from:e,to:t,userAddress:n}){let{st:r,sv:i}=X.getSdkProperties();if(!await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId))throw Error(`Network not supported for Swaps`);return X.get({path:`/v1/convert/build-approve`,headers:{"Content-Type":`application/json`},params:{userAddress:n,from:e,to:t,st:r,sv:i}})},async getBalance(e,t,n){let{st:r,sv:i}=X.getSdkProperties();if(!await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId))return it.showError(`Token Balance Unavailable`),{balances:[]};let a=`${t}:${e}`,o=w.getBalanceCacheForCaipAddress(a);if(o)return o;let s=await X.get({path:`/v1/account/${e}/balance`,params:{currency:`usd`,chainId:t,forceUpdate:n,st:r,sv:i}});return w.updateBalanceCache({caipAddress:a,balance:s,timestamp:Date.now()}),s},async lookupEnsName(e){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?X.get({path:`/v1/profile/account/${e}`,params:{apiVersion:`2`}}):{addresses:{},attributes:[]}},async reverseLookupEnsName({address:e}){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?X.get({path:`/v1/profile/reverse/${e}`,params:{sender:Q.state.address,apiVersion:`2`}}):[]},async getEnsNameSuggestions(e){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?X.get({path:`/v1/profile/suggestions/${e}`,params:{zone:`reown.id`}}):{suggestions:[]}},async registerEnsName({coinType:e,address:t,message:n,signature:r}){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?Y.api.post({path:`/v1/profile/account`,body:{coin_type:e,address:t,message:n,signature:r},headers:{"Content-Type":`application/json`}}):{success:!1}},async generateOnRampURL({destinationWallets:e,partnerUserId:t,defaultNetwork:n,purchaseAmount:r,paymentAmount:i}){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?(await Y.api.post({path:`/v1/generators/onrampurl`,params:{projectId:D.state.projectId},body:{destinationWallets:e,defaultNetwork:n,partnerUserId:t,defaultExperience:`buy`,presetCryptoAmount:r,presetFiatAmount:i}})).url:``},async getOnrampOptions(){if(!await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId))return{paymentCurrencies:[],purchaseCurrencies:[]};try{return await X.get({path:`/v1/onramp/options`})}catch{return vt}},async getOnrampQuote({purchaseCurrency:e,paymentCurrency:t,amount:n,network:r}){try{return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?await Y.api.post({path:`/v1/onramp/quote`,params:{projectId:D.state.projectId},body:{purchaseCurrency:e,paymentCurrency:t,amount:n,network:r}}):null}catch{return{coinbaseFee:{amount:n,currency:t.id},networkFee:{amount:n,currency:t.id},paymentSubtotal:{amount:n,currency:t.id},paymentTotal:{amount:n,currency:t.id},purchaseAmount:{amount:n,currency:t.id},quoteId:`mocked-quote-id`}}},async getSmartSessions(e){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?X.get({path:`/v1/sessions/${e}`}):[]},async revokeSmartSession(e,t,n){return await X.isNetworkSupported(J.state.activeCaipNetwork?.caipNetworkId)?Y.api.post({path:`/v1/sessions/${e}/revoke`,params:{projectId:D.state.projectId},body:{pci:t,signature:n}}):{success:!1}},setClientId(e){Y.clientId=e,Y.api=new je({baseUrl:yt,clientId:e})}},Z=f({currentTab:0,tokenBalance:[],smartAccountDeployed:!1,addressLabels:new Map,allAccounts:[]}),Q=O({state:Z,replaceState(e){e&&Object.assign(Z,h(e))},subscribe(e){return J.subscribeChainProp(`accountState`,t=>{if(t)return e(t)})},subscribeKey(e,t,n){let r;return J.subscribeChainProp(`accountState`,n=>{if(n){let i=n[e];r!==i&&(r=i,t(i))}},n)},setStatus(e,t){J.setAccountProp(`status`,e,t)},getCaipAddress(e){return J.getAccountProp(`caipAddress`,e)},setCaipAddress(e,t){let n=e?T.getPlainAddress(e):void 0;t===J.state.activeChain&&(J.state.activeCaipAddress=e),J.setAccountProp(`caipAddress`,e,t),J.setAccountProp(`address`,n,t)},setBalance(e,t,n){J.setAccountProp(`balance`,e,n),J.setAccountProp(`balanceSymbol`,t,n)},setProfileName(e,t){J.setAccountProp(`profileName`,e,t)},setProfileImage(e,t){J.setAccountProp(`profileImage`,e,t)},setUser(e,t){J.setAccountProp(`user`,e,t)},setAddressExplorerUrl(e,t){J.setAccountProp(`addressExplorerUrl`,e,t)},setSmartAccountDeployed(e,t){J.setAccountProp(`smartAccountDeployed`,e,t)},setCurrentTab(e){J.setAccountProp(`currentTab`,e,J.state.activeChain)},setTokenBalance(e,t){e&&J.setAccountProp(`tokenBalance`,e,t)},setShouldUpdateToAddress(e,t){J.setAccountProp(`shouldUpdateToAddress`,e,t)},setAllAccounts(e,t){J.setAccountProp(`allAccounts`,e,t)},addAddressLabel(e,t,n){let r=J.getAccountProp(`addressLabels`,n)||new Map;r.set(e,t),J.setAccountProp(`addressLabels`,r,n)},removeAddressLabel(e,t){let n=J.getAccountProp(`addressLabels`,t)||new Map;n.delete(e),J.setAccountProp(`addressLabels`,n,t)},setConnectedWalletInfo(e,t){J.setAccountProp(`connectedWalletInfo`,e,t,!1)},setPreferredAccountType(e,t){J.setAccountProp(`preferredAccountTypes`,{...Z.preferredAccountTypes,[t]:e},t)},setPreferredAccountTypes(e){Z.preferredAccountTypes=e},setSocialProvider(e,t){e&&J.setAccountProp(`socialProvider`,e,t)},setSocialWindow(e,t){J.setAccountProp(`socialWindow`,e?h(e):void 0,t)},setFarcasterUrl(e,t){J.setAccountProp(`farcasterUrl`,e,t)},async fetchTokenBalance(e){Z.balanceLoading=!0;let t=J.state.activeCaipNetwork?.caipNetworkId,n=J.state.activeCaipNetwork?.chainNamespace,r=J.state.activeCaipAddress,i=r?T.getPlainAddress(r):void 0;if(Z.lastRetry&&!T.isAllowedRetry(Z.lastRetry,30*C.ONE_SEC_MS))return Z.balanceLoading=!1,[];try{if(i&&t&&n){let e=(await X.getBalance(i,t)).balances.filter(e=>e.quantity.decimals!==`0`);return Q.setTokenBalance(e,n),Z.lastRetry=void 0,Z.balanceLoading=!1,e}}catch(t){Z.lastRetry=Date.now(),e?.(t),it.showError(`Token Balance Unavailable`)}finally{Z.balanceLoading=!1}return[]},resetAccount(e){J.resetAccount(e)}}),bt={onSwitchNetwork({network:e,ignoreSwitchConfirmation:t=!1}){let n=J.state.activeCaipNetwork,r=R.state.data;if(e.id===n?.id)return;let i=Q.getCaipAddress(J.state.activeChain),a=e.chainNamespace!==J.state.activeChain,o=Q.getCaipAddress(e.chainNamespace),s=B.getConnectorId(J.state.activeChain)===_.CONNECTOR_ID.AUTH,c=_.AUTH_CONNECTOR_SUPPORTED_CHAINS.find(t=>t===e.chainNamespace);t||s&&c?R.push(`SwitchNetwork`,{...r,network:e}):i&&a&&!o?R.push(`SwitchActiveChain`,{switchToChain:e.chainNamespace,navigateTo:`Connect`,navigateWithReplace:!0,network:e}):R.push(`SwitchNetwork`,{...r,network:e})}},$=f({loading:!1,loadingNamespaceMap:new Map,open:!1,shake:!1,namespace:void 0}),xt=O({state:$,subscribe(e){return p($,()=>e($))},subscribeKey(e,t){return g($,e,t)},async open(e){let t=Q.state.status===`connected`,n=e?.namespace,r=J.state.activeChain,i=n&&n!==r,a=J.getAccountData(e?.namespace)?.caipAddress;if(W.state.wcBasic?I.prefetch({fetchNetworkImages:!1,fetchConnectorImages:!1}):await I.prefetch({fetchConnectorImages:!t,fetchFeaturedWallets:!t,fetchRecommendedWallets:!t}),B.setFilterByNamespace(e?.namespace),xt.setLoading(!0,n),n&&i){let e=J.getNetworkData(n)?.caipNetwork||J.getRequestedCaipNetworks(n)[0];e&&bt.onSwitchNetwork({network:e,ignoreSwitchConfirmation:!0})}else{let t=J.state.noAdapters;D.state.manualWCControl||t&&!a?T.isMobile()?R.reset(`AllWallets`):R.reset(`ConnectingWalletConnectBasic`):e?.view?R.reset(e.view,e.data):a?R.reset(`Account`):R.reset(`Connect`)}$.open=!0,ct.set({open:!0}),N.sendEvent({type:`track`,event:`MODAL_OPEN`,properties:{connected:!!a}})},close(){let e=D.state.enableEmbedded,t=!!J.state.activeCaipAddress;$.open&&N.sendEvent({type:`track`,event:`MODAL_CLOSE`,properties:{connected:t}}),$.open=!1,R.reset(`Connect`),xt.clearLoading(),e?t?R.replace(`Account`):R.push(`Connect`):ct.set({open:!1}),W.resetUri()},setLoading(e,t){t&&$.loadingNamespaceMap.set(t,e),$.loading=e,ct.set({loading:e})},clearLoading(){$.loadingNamespaceMap.clear(),$.loading=!1},shake(){$.shake||($.shake=!0,setTimeout(()=>{$.shake=!1},500))}}),St=void 0,Ct=void 0,wt=void 0;function Tt(e,t){St=document.createElement(`style`),Ct=document.createElement(`style`),wt=document.createElement(`style`),St.textContent=Ot(e).core.cssText,Ct.textContent=Ot(e).dark.cssText,wt.textContent=Ot(e).light.cssText,document.head.appendChild(St),document.head.appendChild(Ct),document.head.appendChild(wt),Et(t)}function Et(e){Ct&&wt&&(e===`light`?(Ct.removeAttribute(`media`),wt.media=`enabled`):(wt.removeAttribute(`media`),Ct.media=`enabled`))}function Dt(e){St&&Ct&&wt&&(St.textContent=Ot(e).core.cssText,Ct.textContent=Ot(e).dark.cssText,wt.textContent=Ot(e).light.cssText)}function Ot(n){return{core:e`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      @keyframes w3m-shake {
        0% {
          transform: scale(1) rotate(0deg);
        }
        20% {
          transform: scale(1) rotate(-1deg);
        }
        40% {
          transform: scale(1) rotate(1.5deg);
        }
        60% {
          transform: scale(1) rotate(-1.5deg);
        }
        80% {
          transform: scale(1) rotate(1deg);
        }
        100% {
          transform: scale(1) rotate(0deg);
        }
      }
      @keyframes w3m-iframe-fade-out {
        0% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
      @keyframes w3m-iframe-zoom-in {
        0% {
          transform: translateY(50px);
          opacity: 0;
        }
        100% {
          transform: translateY(0px);
          opacity: 1;
        }
      }
      @keyframes w3m-iframe-zoom-in-mobile {
        0% {
          transform: scale(0.95);
          opacity: 0;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      :root {
        --w3m-modal-width: 360px;
        --w3m-color-mix-strength: ${t(n?.[`--w3m-color-mix-strength`]?`${n[`--w3m-color-mix-strength`]}%`:`0%`)};
        --w3m-font-family: ${t(n?.[`--w3m-font-family`]||`Inter, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;`)};
        --w3m-font-size-master: ${t(n?.[`--w3m-font-size-master`]||`10px`)};
        --w3m-border-radius-master: ${t(n?.[`--w3m-border-radius-master`]||`4px`)};
        --w3m-z-index: ${t(n?.[`--w3m-z-index`]||999)};

        --wui-font-family: var(--w3m-font-family);

        --wui-font-size-mini: calc(var(--w3m-font-size-master) * 0.8);
        --wui-font-size-micro: var(--w3m-font-size-master);
        --wui-font-size-tiny: calc(var(--w3m-font-size-master) * 1.2);
        --wui-font-size-small: calc(var(--w3m-font-size-master) * 1.4);
        --wui-font-size-paragraph: calc(var(--w3m-font-size-master) * 1.6);
        --wui-font-size-medium: calc(var(--w3m-font-size-master) * 1.8);
        --wui-font-size-large: calc(var(--w3m-font-size-master) * 2);
        --wui-font-size-title-6: calc(var(--w3m-font-size-master) * 2.2);
        --wui-font-size-medium-title: calc(var(--w3m-font-size-master) * 2.4);
        --wui-font-size-2xl: calc(var(--w3m-font-size-master) * 4);

        --wui-border-radius-5xs: var(--w3m-border-radius-master);
        --wui-border-radius-4xs: calc(var(--w3m-border-radius-master) * 1.5);
        --wui-border-radius-3xs: calc(var(--w3m-border-radius-master) * 2);
        --wui-border-radius-xxs: calc(var(--w3m-border-radius-master) * 3);
        --wui-border-radius-xs: calc(var(--w3m-border-radius-master) * 4);
        --wui-border-radius-s: calc(var(--w3m-border-radius-master) * 5);
        --wui-border-radius-m: calc(var(--w3m-border-radius-master) * 7);
        --wui-border-radius-l: calc(var(--w3m-border-radius-master) * 9);
        --wui-border-radius-3xl: calc(var(--w3m-border-radius-master) * 20);

        --wui-font-weight-light: 400;
        --wui-font-weight-regular: 500;
        --wui-font-weight-medium: 600;
        --wui-font-weight-bold: 700;

        --wui-letter-spacing-2xl: -1.6px;
        --wui-letter-spacing-medium-title: -0.96px;
        --wui-letter-spacing-title-6: -0.88px;
        --wui-letter-spacing-large: -0.8px;
        --wui-letter-spacing-medium: -0.72px;
        --wui-letter-spacing-paragraph: -0.64px;
        --wui-letter-spacing-small: -0.56px;
        --wui-letter-spacing-tiny: -0.48px;
        --wui-letter-spacing-micro: -0.2px;
        --wui-letter-spacing-mini: -0.16px;

        --wui-spacing-0: 0px;
        --wui-spacing-4xs: 2px;
        --wui-spacing-3xs: 4px;
        --wui-spacing-xxs: 6px;
        --wui-spacing-2xs: 7px;
        --wui-spacing-xs: 8px;
        --wui-spacing-1xs: 10px;
        --wui-spacing-s: 12px;
        --wui-spacing-m: 14px;
        --wui-spacing-l: 16px;
        --wui-spacing-2l: 18px;
        --wui-spacing-xl: 20px;
        --wui-spacing-xxl: 24px;
        --wui-spacing-2xl: 32px;
        --wui-spacing-3xl: 40px;
        --wui-spacing-4xl: 90px;
        --wui-spacing-5xl: 95px;

        --wui-icon-box-size-xxs: 14px;
        --wui-icon-box-size-xs: 20px;
        --wui-icon-box-size-sm: 24px;
        --wui-icon-box-size-md: 32px;
        --wui-icon-box-size-mdl: 36px;
        --wui-icon-box-size-lg: 40px;
        --wui-icon-box-size-2lg: 48px;
        --wui-icon-box-size-xl: 64px;

        --wui-icon-size-inherit: inherit;
        --wui-icon-size-xxs: 10px;
        --wui-icon-size-xs: 12px;
        --wui-icon-size-sm: 14px;
        --wui-icon-size-md: 16px;
        --wui-icon-size-mdl: 18px;
        --wui-icon-size-lg: 20px;
        --wui-icon-size-xl: 24px;
        --wui-icon-size-xxl: 28px;

        --wui-wallet-image-size-inherit: inherit;
        --wui-wallet-image-size-sm: 40px;
        --wui-wallet-image-size-md: 56px;
        --wui-wallet-image-size-lg: 80px;

        --wui-visual-size-size-inherit: inherit;
        --wui-visual-size-sm: 40px;
        --wui-visual-size-md: 55px;
        --wui-visual-size-lg: 80px;

        --wui-box-size-md: 100px;
        --wui-box-size-lg: 120px;

        --wui-ease-out-power-2: cubic-bezier(0, 0, 0.22, 1);
        --wui-ease-out-power-1: cubic-bezier(0, 0, 0.55, 1);

        --wui-ease-in-power-3: cubic-bezier(0.66, 0, 1, 1);
        --wui-ease-in-power-2: cubic-bezier(0.45, 0, 1, 1);
        --wui-ease-in-power-1: cubic-bezier(0.3, 0, 1, 1);

        --wui-ease-inout-power-1: cubic-bezier(0.45, 0, 0.55, 1);

        --wui-duration-lg: 200ms;
        --wui-duration-md: 125ms;
        --wui-duration-sm: 75ms;

        --wui-path-network-sm: path(
          'M15.4 2.1a5.21 5.21 0 0 1 5.2 0l11.61 6.7a5.21 5.21 0 0 1 2.61 4.52v13.4c0 1.87-1 3.59-2.6 4.52l-11.61 6.7c-1.62.93-3.6.93-5.22 0l-11.6-6.7a5.21 5.21 0 0 1-2.61-4.51v-13.4c0-1.87 1-3.6 2.6-4.52L15.4 2.1Z'
        );

        --wui-path-network-md: path(
          'M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z'
        );

        --wui-path-network-lg: path(
          'M78.3244 18.926L50.1808 2.45078C45.7376 -0.150261 40.2624 -0.150262 35.8192 2.45078L7.6756 18.926C3.23322 21.5266 0.5 26.3301 0.5 31.5248V64.4752C0.5 69.6699 3.23322 74.4734 7.6756 77.074L35.8192 93.5492C40.2624 96.1503 45.7376 96.1503 50.1808 93.5492L78.3244 77.074C82.7668 74.4734 85.5 69.6699 85.5 64.4752V31.5248C85.5 26.3301 82.7668 21.5266 78.3244 18.926Z'
        );

        --wui-width-network-sm: 36px;
        --wui-width-network-md: 48px;
        --wui-width-network-lg: 86px;

        --wui-height-network-sm: 40px;
        --wui-height-network-md: 54px;
        --wui-height-network-lg: 96px;

        --wui-icon-size-network-xs: 12px;
        --wui-icon-size-network-sm: 16px;
        --wui-icon-size-network-md: 24px;
        --wui-icon-size-network-lg: 42px;

        --wui-color-inherit: inherit;

        --wui-color-inverse-100: #fff;
        --wui-color-inverse-000: #000;

        --wui-cover: rgba(20, 20, 20, 0.8);

        --wui-color-modal-bg: var(--wui-color-modal-bg-base);

        --wui-color-accent-100: var(--wui-color-accent-base-100);
        --wui-color-accent-090: var(--wui-color-accent-base-090);
        --wui-color-accent-080: var(--wui-color-accent-base-080);

        --wui-color-success-100: var(--wui-color-success-base-100);
        --wui-color-success-125: var(--wui-color-success-base-125);

        --wui-color-warning-100: var(--wui-color-warning-base-100);

        --wui-color-error-100: var(--wui-color-error-base-100);
        --wui-color-error-125: var(--wui-color-error-base-125);

        --wui-color-blue-100: var(--wui-color-blue-base-100);
        --wui-color-blue-90: var(--wui-color-blue-base-90);

        --wui-icon-box-bg-error-100: var(--wui-icon-box-bg-error-base-100);
        --wui-icon-box-bg-blue-100: var(--wui-icon-box-bg-blue-base-100);
        --wui-icon-box-bg-success-100: var(--wui-icon-box-bg-success-base-100);
        --wui-icon-box-bg-inverse-100: var(--wui-icon-box-bg-inverse-base-100);

        --wui-all-wallets-bg-100: var(--wui-all-wallets-bg-100);

        --wui-avatar-border: var(--wui-avatar-border-base);

        --wui-thumbnail-border: var(--wui-thumbnail-border-base);

        --wui-wallet-button-bg: var(--wui-wallet-button-bg-base);

        --wui-box-shadow-blue: var(--wui-color-accent-glass-020);
      }

      @supports (background: color-mix(in srgb, white 50%, black)) {
        :root {
          --wui-color-modal-bg: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-modal-bg-base)
          );

          --wui-box-shadow-blue: color-mix(in srgb, var(--wui-color-accent-100) 20%, transparent);

          --wui-color-accent-100: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 100%,
            transparent
          );
          --wui-color-accent-090: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 90%,
            transparent
          );
          --wui-color-accent-080: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 80%,
            transparent
          );
          --wui-color-accent-glass-090: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 90%,
            transparent
          );
          --wui-color-accent-glass-080: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 80%,
            transparent
          );
          --wui-color-accent-glass-020: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 20%,
            transparent
          );
          --wui-color-accent-glass-015: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 15%,
            transparent
          );
          --wui-color-accent-glass-010: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 10%,
            transparent
          );
          --wui-color-accent-glass-005: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 5%,
            transparent
          );
          --wui-color-accent-002: color-mix(
            in srgb,
            var(--wui-color-accent-base-100) 2%,
            transparent
          );

          --wui-color-fg-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-100)
          );
          --wui-color-fg-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-125)
          );
          --wui-color-fg-150: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-150)
          );
          --wui-color-fg-175: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-175)
          );
          --wui-color-fg-200: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-200)
          );
          --wui-color-fg-225: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-225)
          );
          --wui-color-fg-250: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-250)
          );
          --wui-color-fg-275: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-275)
          );
          --wui-color-fg-300: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-300)
          );
          --wui-color-fg-325: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-325)
          );
          --wui-color-fg-350: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-fg-350)
          );

          --wui-color-bg-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-100)
          );
          --wui-color-bg-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-125)
          );
          --wui-color-bg-150: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-150)
          );
          --wui-color-bg-175: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-175)
          );
          --wui-color-bg-200: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-200)
          );
          --wui-color-bg-225: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-225)
          );
          --wui-color-bg-250: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-250)
          );
          --wui-color-bg-275: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-275)
          );
          --wui-color-bg-300: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-300)
          );
          --wui-color-bg-325: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-325)
          );
          --wui-color-bg-350: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-bg-350)
          );

          --wui-color-success-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-success-base-100)
          );
          --wui-color-success-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-success-base-125)
          );

          --wui-color-warning-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-warning-base-100)
          );

          --wui-color-error-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-error-base-100)
          );
          --wui-color-blue-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-blue-base-100)
          );
          --wui-color-blue-90: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-blue-base-90)
          );
          --wui-color-error-125: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-color-error-base-125)
          );

          --wui-icon-box-bg-error-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-error-base-100)
          );
          --wui-icon-box-bg-accent-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-blue-base-100)
          );
          --wui-icon-box-bg-success-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-success-base-100)
          );
          --wui-icon-box-bg-inverse-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-icon-box-bg-inverse-base-100)
          );

          --wui-all-wallets-bg-100: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-all-wallets-bg-100)
          );

          --wui-avatar-border: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-avatar-border-base)
          );

          --wui-thumbnail-border: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-thumbnail-border-base)
          );

          --wui-wallet-button-bg: color-mix(
            in srgb,
            var(--w3m-color-mix) var(--w3m-color-mix-strength),
            var(--wui-wallet-button-bg-base)
          );
        }
      }
    `,light:e`
      :root {
        --w3m-color-mix: ${t(n?.[`--w3m-color-mix`]||`#fff`)};
        --w3m-accent: ${t(Ee(n,`dark`)[`--w3m-accent`])};
        --w3m-default: #fff;

        --wui-color-modal-bg-base: ${t(Ee(n,`dark`)[`--w3m-background`])};
        --wui-color-accent-base-100: var(--w3m-accent);

        --wui-color-blueberry-100: hsla(230, 100%, 67%, 1);
        --wui-color-blueberry-090: hsla(231, 76%, 61%, 1);
        --wui-color-blueberry-080: hsla(230, 59%, 55%, 1);
        --wui-color-blueberry-050: hsla(231, 100%, 70%, 0.1);

        --wui-color-fg-100: #e4e7e7;
        --wui-color-fg-125: #d0d5d5;
        --wui-color-fg-150: #a8b1b1;
        --wui-color-fg-175: #a8b0b0;
        --wui-color-fg-200: #949e9e;
        --wui-color-fg-225: #868f8f;
        --wui-color-fg-250: #788080;
        --wui-color-fg-275: #788181;
        --wui-color-fg-300: #6e7777;
        --wui-color-fg-325: #9a9a9a;
        --wui-color-fg-350: #363636;

        --wui-color-bg-100: #141414;
        --wui-color-bg-125: #191a1a;
        --wui-color-bg-150: #1e1f1f;
        --wui-color-bg-175: #222525;
        --wui-color-bg-200: #272a2a;
        --wui-color-bg-225: #2c3030;
        --wui-color-bg-250: #313535;
        --wui-color-bg-275: #363b3b;
        --wui-color-bg-300: #3b4040;
        --wui-color-bg-325: #252525;
        --wui-color-bg-350: #ffffff;

        --wui-color-success-base-100: #26d962;
        --wui-color-success-base-125: #30a46b;

        --wui-color-warning-base-100: #f3a13f;

        --wui-color-error-base-100: #f25a67;
        --wui-color-error-base-125: #df4a34;

        --wui-color-blue-base-100: rgba(102, 125, 255, 1);
        --wui-color-blue-base-90: rgba(102, 125, 255, 0.9);

        --wui-color-success-glass-001: rgba(38, 217, 98, 0.01);
        --wui-color-success-glass-002: rgba(38, 217, 98, 0.02);
        --wui-color-success-glass-005: rgba(38, 217, 98, 0.05);
        --wui-color-success-glass-010: rgba(38, 217, 98, 0.1);
        --wui-color-success-glass-015: rgba(38, 217, 98, 0.15);
        --wui-color-success-glass-020: rgba(38, 217, 98, 0.2);
        --wui-color-success-glass-025: rgba(38, 217, 98, 0.25);
        --wui-color-success-glass-030: rgba(38, 217, 98, 0.3);
        --wui-color-success-glass-060: rgba(38, 217, 98, 0.6);
        --wui-color-success-glass-080: rgba(38, 217, 98, 0.8);

        --wui-color-success-glass-reown-020: rgba(48, 164, 107, 0.2);

        --wui-color-warning-glass-reown-020: rgba(243, 161, 63, 0.2);

        --wui-color-error-glass-001: rgba(242, 90, 103, 0.01);
        --wui-color-error-glass-002: rgba(242, 90, 103, 0.02);
        --wui-color-error-glass-005: rgba(242, 90, 103, 0.05);
        --wui-color-error-glass-010: rgba(242, 90, 103, 0.1);
        --wui-color-error-glass-015: rgba(242, 90, 103, 0.15);
        --wui-color-error-glass-020: rgba(242, 90, 103, 0.2);
        --wui-color-error-glass-025: rgba(242, 90, 103, 0.25);
        --wui-color-error-glass-030: rgba(242, 90, 103, 0.3);
        --wui-color-error-glass-060: rgba(242, 90, 103, 0.6);
        --wui-color-error-glass-080: rgba(242, 90, 103, 0.8);

        --wui-color-error-glass-reown-020: rgba(223, 74, 52, 0.2);

        --wui-color-gray-glass-001: rgba(255, 255, 255, 0.01);
        --wui-color-gray-glass-002: rgba(255, 255, 255, 0.02);
        --wui-color-gray-glass-005: rgba(255, 255, 255, 0.05);
        --wui-color-gray-glass-010: rgba(255, 255, 255, 0.1);
        --wui-color-gray-glass-015: rgba(255, 255, 255, 0.15);
        --wui-color-gray-glass-020: rgba(255, 255, 255, 0.2);
        --wui-color-gray-glass-025: rgba(255, 255, 255, 0.25);
        --wui-color-gray-glass-030: rgba(255, 255, 255, 0.3);
        --wui-color-gray-glass-060: rgba(255, 255, 255, 0.6);
        --wui-color-gray-glass-080: rgba(255, 255, 255, 0.8);
        --wui-color-gray-glass-090: rgba(255, 255, 255, 0.9);

        --wui-color-dark-glass-100: rgba(42, 42, 42, 1);

        --wui-icon-box-bg-error-base-100: #3c2426;
        --wui-icon-box-bg-blue-base-100: #20303f;
        --wui-icon-box-bg-success-base-100: #1f3a28;
        --wui-icon-box-bg-inverse-base-100: #243240;

        --wui-all-wallets-bg-100: #222b35;

        --wui-avatar-border-base: #252525;

        --wui-thumbnail-border-base: #252525;

        --wui-wallet-button-bg-base: var(--wui-color-bg-125);

        --w3m-card-embedded-shadow-color: rgb(17 17 18 / 25%);
      }
    `,dark:e`
      :root {
        --w3m-color-mix: ${t(n?.[`--w3m-color-mix`]||`#000`)};
        --w3m-accent: ${t(Ee(n,`light`)[`--w3m-accent`])};
        --w3m-default: #000;

        --wui-color-modal-bg-base: ${t(Ee(n,`light`)[`--w3m-background`])};
        --wui-color-accent-base-100: var(--w3m-accent);

        --wui-color-blueberry-100: hsla(231, 100%, 70%, 1);
        --wui-color-blueberry-090: hsla(231, 97%, 72%, 1);
        --wui-color-blueberry-080: hsla(231, 92%, 74%, 1);

        --wui-color-fg-100: #141414;
        --wui-color-fg-125: #2d3131;
        --wui-color-fg-150: #474d4d;
        --wui-color-fg-175: #636d6d;
        --wui-color-fg-200: #798686;
        --wui-color-fg-225: #828f8f;
        --wui-color-fg-250: #8b9797;
        --wui-color-fg-275: #95a0a0;
        --wui-color-fg-300: #9ea9a9;
        --wui-color-fg-325: #9a9a9a;
        --wui-color-fg-350: #d0d0d0;

        --wui-color-bg-100: #ffffff;
        --wui-color-bg-125: #f5fafa;
        --wui-color-bg-150: #f3f8f8;
        --wui-color-bg-175: #eef4f4;
        --wui-color-bg-200: #eaf1f1;
        --wui-color-bg-225: #e5eded;
        --wui-color-bg-250: #e1e9e9;
        --wui-color-bg-275: #dce7e7;
        --wui-color-bg-300: #d8e3e3;
        --wui-color-bg-325: #f3f3f3;
        --wui-color-bg-350: #202020;

        --wui-color-success-base-100: #26b562;
        --wui-color-success-base-125: #30a46b;

        --wui-color-warning-base-100: #f3a13f;

        --wui-color-error-base-100: #f05142;
        --wui-color-error-base-125: #df4a34;

        --wui-color-blue-base-100: rgba(102, 125, 255, 1);
        --wui-color-blue-base-90: rgba(102, 125, 255, 0.9);

        --wui-color-success-glass-001: rgba(38, 181, 98, 0.01);
        --wui-color-success-glass-002: rgba(38, 181, 98, 0.02);
        --wui-color-success-glass-005: rgba(38, 181, 98, 0.05);
        --wui-color-success-glass-010: rgba(38, 181, 98, 0.1);
        --wui-color-success-glass-015: rgba(38, 181, 98, 0.15);
        --wui-color-success-glass-020: rgba(38, 181, 98, 0.2);
        --wui-color-success-glass-025: rgba(38, 181, 98, 0.25);
        --wui-color-success-glass-030: rgba(38, 181, 98, 0.3);
        --wui-color-success-glass-060: rgba(38, 181, 98, 0.6);
        --wui-color-success-glass-080: rgba(38, 181, 98, 0.8);

        --wui-color-success-glass-reown-020: rgba(48, 164, 107, 0.2);

        --wui-color-warning-glass-reown-020: rgba(243, 161, 63, 0.2);

        --wui-color-error-glass-001: rgba(240, 81, 66, 0.01);
        --wui-color-error-glass-002: rgba(240, 81, 66, 0.02);
        --wui-color-error-glass-005: rgba(240, 81, 66, 0.05);
        --wui-color-error-glass-010: rgba(240, 81, 66, 0.1);
        --wui-color-error-glass-015: rgba(240, 81, 66, 0.15);
        --wui-color-error-glass-020: rgba(240, 81, 66, 0.2);
        --wui-color-error-glass-025: rgba(240, 81, 66, 0.25);
        --wui-color-error-glass-030: rgba(240, 81, 66, 0.3);
        --wui-color-error-glass-060: rgba(240, 81, 66, 0.6);
        --wui-color-error-glass-080: rgba(240, 81, 66, 0.8);

        --wui-color-error-glass-reown-020: rgba(223, 74, 52, 0.2);

        --wui-icon-box-bg-error-base-100: #f4dfdd;
        --wui-icon-box-bg-blue-base-100: #d9ecfb;
        --wui-icon-box-bg-success-base-100: #daf0e4;
        --wui-icon-box-bg-inverse-base-100: #dcecfc;

        --wui-all-wallets-bg-100: #e8f1fa;

        --wui-avatar-border-base: #f3f4f4;

        --wui-thumbnail-border-base: #eaefef;

        --wui-wallet-button-bg-base: var(--wui-color-bg-125);

        --wui-color-gray-glass-001: rgba(0, 0, 0, 0.01);
        --wui-color-gray-glass-002: rgba(0, 0, 0, 0.02);
        --wui-color-gray-glass-005: rgba(0, 0, 0, 0.05);
        --wui-color-gray-glass-010: rgba(0, 0, 0, 0.1);
        --wui-color-gray-glass-015: rgba(0, 0, 0, 0.15);
        --wui-color-gray-glass-020: rgba(0, 0, 0, 0.2);
        --wui-color-gray-glass-025: rgba(0, 0, 0, 0.25);
        --wui-color-gray-glass-030: rgba(0, 0, 0, 0.3);
        --wui-color-gray-glass-060: rgba(0, 0, 0, 0.6);
        --wui-color-gray-glass-080: rgba(0, 0, 0, 0.8);
        --wui-color-gray-glass-090: rgba(0, 0, 0, 0.9);

        --wui-color-dark-glass-100: rgba(233, 233, 233, 1);

        --w3m-card-embedded-shadow-color: rgb(224 225 233 / 25%);
      }
    `}}var kt=e`
  *,
  *::after,
  *::before,
  :host {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-style: normal;
    text-rendering: optimizeSpeed;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    -webkit-tap-highlight-color: transparent;
    font-family: var(--wui-font-family);
    backface-visibility: hidden;
  }
`,At=e`
  button,
  a {
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;
    transition:
      color var(--wui-duration-lg) var(--wui-ease-out-power-1),
      background-color var(--wui-duration-lg) var(--wui-ease-out-power-1),
      border var(--wui-duration-lg) var(--wui-ease-out-power-1),
      border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1),
      box-shadow var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: background-color, color, border, box-shadow, border-radius;
    outline: none;
    border: none;
    column-gap: var(--wui-spacing-3xs);
    background-color: transparent;
    text-decoration: none;
  }

  wui-flex {
    transition: border-radius var(--wui-duration-lg) var(--wui-ease-out-power-1);
    will-change: border-radius;
  }

  button:disabled > wui-wallet-image,
  button:disabled > wui-all-wallets-image,
  button:disabled > wui-network-image,
  button:disabled > wui-image,
  button:disabled > wui-transaction-visual,
  button:disabled > wui-logo {
    filter: grayscale(1);
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: var(--wui-color-gray-glass-005);
    }

    button:active:enabled {
      background-color: var(--wui-color-gray-glass-010);
    }
  }

  button:disabled > wui-icon-box {
    opacity: 0.5;
  }

  input {
    border: none;
    outline: none;
    appearance: none;
  }
`,jt=e`
  .wui-color-inherit {
    color: var(--wui-color-inherit);
  }

  .wui-color-accent-100 {
    color: var(--wui-color-accent-100);
  }

  .wui-color-error-100 {
    color: var(--wui-color-error-100);
  }

  .wui-color-blue-100 {
    color: var(--wui-color-blue-100);
  }

  .wui-color-blue-90 {
    color: var(--wui-color-blue-90);
  }

  .wui-color-error-125 {
    color: var(--wui-color-error-125);
  }

  .wui-color-success-100 {
    color: var(--wui-color-success-100);
  }

  .wui-color-success-125 {
    color: var(--wui-color-success-125);
  }

  .wui-color-inverse-100 {
    color: var(--wui-color-inverse-100);
  }

  .wui-color-inverse-000 {
    color: var(--wui-color-inverse-000);
  }

  .wui-color-fg-100 {
    color: var(--wui-color-fg-100);
  }

  .wui-color-fg-200 {
    color: var(--wui-color-fg-200);
  }

  .wui-color-fg-300 {
    color: var(--wui-color-fg-300);
  }

  .wui-color-fg-325 {
    color: var(--wui-color-fg-325);
  }

  .wui-color-fg-350 {
    color: var(--wui-color-fg-350);
  }

  .wui-bg-color-inherit {
    background-color: var(--wui-color-inherit);
  }

  .wui-bg-color-blue-100 {
    background-color: var(--wui-color-accent-100);
  }

  .wui-bg-color-error-100 {
    background-color: var(--wui-color-error-100);
  }

  .wui-bg-color-error-125 {
    background-color: var(--wui-color-error-125);
  }

  .wui-bg-color-success-100 {
    background-color: var(--wui-color-success-100);
  }

  .wui-bg-color-success-125 {
    background-color: var(--wui-color-success-100);
  }

  .wui-bg-color-inverse-100 {
    background-color: var(--wui-color-inverse-100);
  }

  .wui-bg-color-inverse-000 {
    background-color: var(--wui-color-inverse-000);
  }

  .wui-bg-color-fg-100 {
    background-color: var(--wui-color-fg-100);
  }

  .wui-bg-color-fg-200 {
    background-color: var(--wui-color-fg-200);
  }

  .wui-bg-color-fg-300 {
    background-color: var(--wui-color-fg-300);
  }

  .wui-color-fg-325 {
    background-color: var(--wui-color-fg-325);
  }

  .wui-color-fg-350 {
    background-color: var(--wui-color-fg-350);
  }
`,Mt={ACCOUNT_TABS:[{label:`Tokens`},{label:`NFTs`},{label:`Activity`}],SECURE_SITE_ORIGIN:(typeof process<`u`?{}.NEXT_PUBLIC_SECURE_SITE_ORIGIN:void 0)||`https://secure.walletconnect.org`,VIEW_DIRECTION:{Next:`next`,Prev:`prev`},DEFAULT_CONNECT_METHOD_ORDER:[`email`,`social`,`wallet`],ANIMATION_DURATIONS:{HeaderText:120,ModalHeight:150,ViewTransition:150}};export{C as A,Ke as C,D,O as E,g as F,f as I,h as L,Oe as M,v as N,T as O,_ as P,p as R,N as S,j as T,nt as _,kt as a,R as b,xt as c,J as d,K as f,it as g,W as h,Tt as i,ke as j,w as k,Q as l,ct as m,jt as n,Et as o,dt as p,At as r,Dt as s,Mt as t,X as u,B as v,We as w,I as x,et as y};
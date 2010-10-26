;(function(exports){exports.names=['','Message','Prefix','Server','Person','Nick','User','Host','Command','Params','Middle','Trailing','NonTerminating','SquareBrackets','CurlyBrackets','Backtick','AlphaNum','Letter','Num','CRLF','S','_'];exports.parse=Parser
Parser.names=exports.names
function Parser(out){var eof=false,s='',l=0,S=86016,T,M,F,D,R,tbl=[],x,pos=0,offset=0,buf=[],bufs=[],states=[],posns=[],c,equiv,ds,dp,failed=0,emp=0,emps=[];
equiv=rle_dec([10,0,1,1,2,0,1,2,18,0,1,3,1,4,11,0,1,5,1,6,1,7,10,8,1,9,2,0,1,10,2,0,1,11,26,12,1,13,1,0,1,13,1,14,1,5,1,15,26,12,1,16,1,17,1,16,1,10,55169,0,2048,18,8192,0])
function rle_dec(a){var r=[],i,l,n,x,ll;for(i=0,l=a.length;i<l;i+=2){n=a[i];x=a[i+1];r.length=ll=r.length+n;for(;n;n--)r[ll-n]=x}return r}
T=[,90112,331776,556038,348160,445446,507904,380928,131072,180224,207878,294912,,,,,425984,,,,281606,614400,94208,11439,155,36015,110592,40111,155,81071,,,138246,139264,72879,147456,72879,155648,76975,76975,76975,155,,,85167,188416,44207,196608,48303,155,211974,215558,217088,,225280,85167,52399,240646,244230,245760,,253952,85167,52399,266240,85167,155,,282624,,290816,,,303104,307200,52399,85167,319488,323584,52399,85167,,339968,15535,19631,23727,356352,27823,155,368640,31919,155,85167,,389120,393216,68783,56495,,409600,413696,68783,56495,,430080,72879,76975,,446464,450560,68783,56495,60591,64687,,475136,479232,68783,56495,60591,64687,,,,,516096,520192,68783,56495,,536576,540672,68783,56495,,557056,561152,68783,56495,,577536,581632,68783,56495,,598016,602112,27823,31919,85167,7343,622592,]
M=rle_dec([1,,21,153,1,102400,2,153,1,106496,1,118784,3,153,2,,2,153,1,143360,1,153,1,147456,1,153,1,159744,1,163840,1,167936,1,153,2,,1,184320,1,192512,1,188416,3,153,1,262144,1,233472,1,223750,1,154,1,229376,1,154,2,153,1,240646,1,252422,1,154,1,258048,1,154,4,153,1,,1,153,1,286720,1,153,1,290816,1,302086,1,153,1,315392,3,153,1,319488,2,153,1,335872,3,153,1,352256,1,364544,2,153,1,376832,3,153,1,388102,1,153,1,405504,4,153,1,409600,6,153,1,,1,153,1,471040,6,153,1,475136,5,153,2,,1,515078,1,153,1,532480,4,153,1,536576,3,153,1,596486,1,573440,4,153,1,577536,3,153,1,610304,1,154,3,153,1,618496,1,153,1,154])
F=rle_dec([1,,22,154,1,98304,3,154,1,114688,2,154,2,,1,154,1,154630,2,154,1,153,5,154,2,,2,154,1,153,1,154,1,200704,4,154,1,153,1,154,1,153,2,154,1,153,1,154,1,153,1,154,1,153,2,154,1,270336,1,154,1,,3,154,1,153,3,154,1,311296,2,154,1,153,1,327680,3,154,1,344064,3,154,1,360448,2,154,1,372736,5,154,1,397312,1,401408,2,154,1,153,1,417792,1,421888,2,154,1,434176,1,154,1,,2,154,1,454656,1,458752,1,462848,1,466944,2,154,1,153,1,483328,1,487424,1,491520,1,495616,1,154,2,,3,154,1,524288,1,528384,2,154,1,153,1,544768,1,548864,3,154,1,565248,1,569344,2,154,1,153,1,585728,1,589824,2,154,1,153,1,606208,4,154,1,153])
D=function(a,i,l,b){for(i=0,l=a.length,b=[];i<l;i++)b[i]=a[i]&&revive(a[i]);return b}([,,,,,,,,,,,,[[[[0,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]]]],[[[[13]]]],[[[[16]]]],[[[[15]]]],,[[[[12]]]],[[[[8]]]],[[[[2]]],[[[1]]]],,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,[[[[9]]]],,,,,,,[[[[9]]]],,,,,,,,,[[[[3]]]],,[[[[3]]]],[[[[9]]]],,,,,,,,,[[[[9]]]],,,,,,,,,,,,[[[[11]]]],,,,,[[[[5,6,7,9,17]]]],,,,,[[[[5,6,7,9,17]]]],,,,,,,,,,,[[[[5,14,17]]]],,,,,,,[[[[5,14,17]]]],,,[[[[4]]]],,,,,[[[[5,6,10]]]],,,,,[[[[5,6,10]]]],,,,,[[[[5,6,17]]]],,,,,[[[[5,6,17]]]],,,,,,,,[[[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]]]]])
function revive(x){var i,l,state,j,l2,all=[],t,ts;if(!x)return;for(i=0,l=x.length;i<l;i++){state=x[i];ts=[];for(j=0,l2=state.length;j<l2;j++){t=state[j];if(t[1]==l) ts.push([t[0],true]);else ts.push([t[0],t[1]==undefined?i+1:t[1]])}all.push(ts)}return dfa(all)
 function dfa(ss){var i,l_ss,st,l_s,t,l_t,a,d=[],j,k,l;for(i=0,l_ss=ss.length;i<l_ss;i++){st=ss[i];a=[];for(j=0,l_s=st.length;j<l_s;j++){t=st[j];for(k=0,l_t=t[0].length;k<l_t;k++){a[t[0][k]]=t[1]===true?l_ss:t[1]}}for(j=0,l=a.length;j<l;j++)if(a[j]==undefined)a[j]=l_ss+1;d[i]=a}
  return function _dfa(st,i){var eq,pr;while(st<l_ss){eq=equiv[s.charCodeAt(i++)];st=d[pr=st][eq]}if(eq==undefined&&i>=s.length){ds=pr;dp=i-1;return}ds=0;dp=undefined;if(st==l_ss){pos=i;return true}return false}}}
if(typeof out=='string'){s=out;out=[];x=Parser(function(m,x,y){if(m=='fail')out=[false,x,y,s];if(m=='tree segment')out=out.concat(x)});x('chunk',s);x('eof');return out[0]===false?out:[true,{names:exports.names,tree:out,input:s}]}
return function(m,x){if(failed){out('fail',pos,'parse already failed');return}
switch(m){
case 'chunk':s+=x;l=s.length;while(tbl.length<l+1)tbl.push([]);mainloop();break
case 'eof':eof=true;mainloop();break
default:throw new Error('unhandled message: '+m)}}
//mainloop
function mainloop(){for(;;){
if(dp==undefined&&(S>164||S<155))
t_block:{
if(S&4/*pushpos*/)posns.push(pos)
if(S&2/*t_bufferout*/){bufs.push(buf);buf=[]}
if(S&8/*t_emitstate*/){emps.push(emp);emp=pos;buf.push(S>>>12)}
if(S&1/*cache*/&&(x=tbl[pos-offset][S])!=undefined){if(x){R=true;pos=x[0];buf=x[1];if(emp<x[2])emp=x[2]}else{R=false}}
}
if(R==undefined){
if(D[S>>>12]){R=D[S>>>12](ds||0,dp||pos);if(R==undefined){if(eof){ds=dp=undefined;R=false}else{out('ready');return}}}
else{states.push(S);S=T[S>>>12]}
if(S==155){R=true;S=states.pop()}}
while(R!=undefined){
if(S==86016){(R?emit:fail)();return}if(R){
if(S&1/*cache*/){tbl[posns[posns.length-1]][S]=[pos,buf,emp];buf=buf.slice()}
if(S&8/*t_emitstate*/){if(pos!=emp&&emp!=posns[posns.length-1]){buf.push(-1,pos-emp)}emp=emps.pop();if(emp!=posns[posns.length-1]){buf=[-1,posns[posns.length-1]-emp].concat(buf)}}
if(S&16/*m_emitstate*/)buf.push(S>>>12)
if(S&32/*m_emitclose*/)buf.push(-2)
if(S&128/*m_emitlength*/)buf.push(pos-posns[posns.length-1])
if(S&8/*t_emitstate*/){emp=pos}
if(S&256/*m_resetpos*/)pos=posns[posns.length-1]
if(S&4/*pushpos*/)posns.pop()
if(S&512/*m_tossbuf*/)buf=bufs.pop()
if(S&1024/*m_emitbuf*/){buf=bufs.pop().concat(buf);}
if(!bufs.length&&buf.length>64)emit()
S=M[S>>>12]}
else{
if(S&1/*cache*/)tbl[posns[posns.length-1]][S]=false
if(S&4/*pushpos*/)pos=posns.pop()
if(S&2048/*f_tossbuf*/)buf=bufs.pop()
if(S&8/*t_emitstate*/){emp=emps.pop()}
if(emp>pos){emp=pos}
S=F[S>>>12]}
if(S==153){R=true;S=states.pop()}else if(S==154){R=false;S=states.pop()}else R=undefined;}}}
function emit(){var x=bufs.length?bufs[0]:buf;if(x.length){out('tree segment',x);if(bufs.length)bufs[0]=[];else buf=[]}}
function fail(s){out('fail',pos,s);failed=1}}
})(typeof exports=='object'?exports:Parser={});
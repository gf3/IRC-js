;(function(exports){exports.names=['','Message','Prefix','Server','Person','Nick','User','Host','Command','Params','Middle','Trailing','NonTerminating','SquareBrackets','CurlyBrackets','Backtick','AlphaNum','Letter','Num','CRLF','S','_'];exports.parse=Parser
Parser.names=exports.names
function Parser(out){var eof=false,s='',l=0,S=86016,T,M,F,D,R,tbl=[],x,pos=0,offset=0,buf=[],bufs=[],states=[],posns=[],c,equiv,ds,dp,failed=0,emp=0,emps=[];
equiv=rle_dec([10,0,1,1,2,0,1,2,18,0,1,3,1,4,11,0,1,5,1,6,1,7,10,8,1,9,2,0,1,10,2,0,1,11,26,12,1,13,1,0,1,13,1,14,1,5,1,15,26,12,1,16,1,17,1,16,1,10,55169,0,2048,18,8192,0])
function rle_dec(a){var r=[],i,l,n,x,ll;for(i=0,l=a.length;i<l;i+=2){n=a[i];x=a[i+1];r.length=ll=r.length+n;for(;n;n--)r[ll-n]=x}return r}
T=[,90112,315392,539654,331776,429062,491520,364544,131072,180224,207878,294912,,,,,409600,,,,281606,598016,94208,11439,151,36015,110592,40111,151,81071,,,138246,139264,72879,147456,72879,155648,76975,76975,76975,151,,,85167,188416,44207,196608,48303,151,211974,215558,217088,,225280,85167,52399,240646,244230,245760,,253952,85167,52399,266240,85167,151,,282624,,290816,,,303104,307200,52399,85167,,323584,15535,19631,23727,339968,27823,151,352256,31919,151,85167,,372736,376832,68783,56495,,393216,397312,68783,56495,,413696,72879,76975,,430080,434176,68783,56495,60591,64687,,458752,462848,68783,56495,60591,64687,,,,,499712,503808,68783,56495,,520192,524288,68783,56495,,540672,544768,68783,56495,,561152,565248,68783,56495,,581632,585728,27823,31919,85167,7343,606208,]
M=rle_dec([1,,21,149,1,102400,2,149,1,106496,1,118784,3,149,2,,2,149,1,143360,1,149,1,147456,1,149,1,159744,1,163840,1,167936,1,149,2,,1,184320,1,192512,1,188416,3,149,1,262144,1,233472,1,223750,1,150,1,229376,1,150,2,149,1,240646,1,252422,1,150,1,258048,1,150,4,149,1,,1,149,1,286720,1,149,1,290816,1,299008,1,149,1,303104,2,149,1,319488,3,149,1,335872,1,348160,2,149,1,360448,3,149,1,371718,1,149,1,389120,4,149,1,393216,6,149,1,,1,149,1,454656,6,149,1,458752,5,149,2,,1,498694,1,149,1,516096,4,149,1,520192,3,149,1,580102,1,557056,4,149,1,561152,3,149,1,593920,1,150,3,149,1,602112,1,149,1,150])
F=rle_dec([1,,22,150,1,98304,3,150,1,114688,2,150,2,,1,150,1,154630,2,150,1,149,5,150,2,,2,150,1,149,1,150,1,200704,4,150,1,149,1,150,1,149,2,150,1,149,1,150,1,149,1,150,1,149,2,150,1,270336,1,150,1,,3,150,1,149,2,150,1,149,1,311296,3,150,1,327680,3,150,1,344064,2,150,1,356352,5,150,1,380928,1,385024,2,150,1,149,1,401408,1,405504,2,150,1,417792,1,150,1,,2,150,1,438272,1,442368,1,446464,1,450560,2,150,1,149,1,466944,1,471040,1,475136,1,479232,1,150,2,,3,150,1,507904,1,512000,2,150,1,149,1,528384,1,532480,3,150,1,548864,1,552960,2,150,1,149,1,569344,1,573440,2,150,1,149,1,589824,4,150,1,149])
D=function(a,i,l,b){for(i=0,l=a.length,b=[];i<l;i++)b[i]=a[i]&&revive(a[i]);return b}([,,,,,,,,,,,,[[[[0,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]]]],[[[[13]]]],[[[[16]]]],[[[[15]]]],,[[[[12]]]],[[[[8]]]],[[[[2]]],[[[1]]]],,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,[[[[9]]]],,,,,,,[[[[9]]]],,,,,,,,,[[[[3]]]],,[[[[3]]]],[[[[9]]]],,,,,[[[[9]]]],,,,,,,,,,,,[[[[11]]]],,,,,[[[[5,6,7,9,17]]]],,,,,[[[[5,6,7,9,17]]]],,,,,,,,,,,[[[[5,14,17]]]],,,,,,,[[[[5,14,17]]]],,,[[[[4]]]],,,,,[[[[5,6,10]]]],,,,,[[[[5,6,10]]]],,,,,[[[[5,6,17]]]],,,,,[[[[5,6,17]]]],,,,,,,,[[[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]]]]])
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
if(dp==undefined&&(S>160||S<151))
t_block:{
if(S&4/*pushpos*/)posns.push(pos)
if(S&2/*t_bufferout*/){bufs.push(buf);buf=[]}
if(S&8/*t_emitstate*/){emps.push(emp);emp=pos;buf.push(S>>>12)}
if(S&1/*cache*/&&(x=tbl[pos-offset][S])!=undefined){if(x){R=true;pos=x[0];buf=x[1];if(emp<x[2])emp=x[2]}else{R=false}}
}
if(R==undefined){
if(D[S>>>12]){R=D[S>>>12](ds||0,dp||pos);if(R==undefined){if(eof){ds=dp=undefined;R=false}else{out('ready');return}}}
else{states.push(S);S=T[S>>>12]}
if(S==151){R=true;S=states.pop()}}
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
if(S==149){R=true;S=states.pop()}else if(S==150){R=false;S=states.pop()}else R=undefined;}}}
function emit(){var x=bufs.length?bufs[0]:buf;if(x.length){out('tree segment',x);if(bufs.length)bufs[0]=[];else buf=[]}}
function fail(s){out('fail',pos,s);failed=1}}
})(typeof exports=='object'?exports:Parser={});
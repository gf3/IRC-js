;(function(exports){exports.names=['','Message','Prefix','Server','Person','Nick','User','Host','Command','Params','Middle','Trailing','NonTerminating','SquareBrackets','CurlyBrackets','Backtick','AlphaNum','Letter','Num','CRLF','S','_'];exports.parse=parser
parser.names=exports.names
function parser(out){var eof=false,s='',l=0,S=86016,T,M,F,D,R,tbl=[],x,pos=0,offset=0,buf=[],bufs=[],states=[],posns=[],c,equiv,ds,dp,failed=0,emp=0,emps=[];
equiv=rle_dec([10,0,1,1,2,0,1,2,18,0,1,3,1,4,8,0,1,5,2,0,1,6,1,7,1,8,10,9,1,10,2,0,1,11,2,0,1,12,26,13,1,14,1,15,1,14,1,15,1,6,1,16,26,13,1,17,1,6,1,17,1,11,55169,0,2048,18,8192,0])
function rle_dec(a){var r=[],i,l,n,x,ll;for(i=0,l=a.length;i<l;i+=2){n=a[i];x=a[i+1];r.length=ll=r.length+n;for(;n;n--)r[ll-n]=x}return r}
T=[,90112,315392,543750,331776,433158,495616,368640,131072,180224,207878,294912,,,,,413696,,,,281606,602112,94208,11439,152,36015,110592,40111,152,81071,,,138246,139264,72879,147456,72879,155648,76975,76975,76975,152,,,85167,188416,44207,196608,48303,152,211974,215558,217088,,225280,85167,52399,240646,244230,245760,,253952,85167,52399,266240,85167,152,,282624,,290816,,,303104,307200,52399,85167,,323584,15535,19631,23727,343046,344064,348160,27823,152,31919,152,85167,,376832,380928,68783,56495,,397312,401408,68783,56495,,417792,72879,76975,,434176,438272,68783,56495,60591,64687,,462848,466944,68783,56495,60591,64687,,,,,503808,507904,68783,56495,,524288,528384,68783,56495,,544768,548864,68783,56495,,565248,569344,68783,56495,,585728,589824,27823,31919,85167,7343,610304,]
M=rle_dec([1,,21,150,1,102400,2,150,1,106496,1,118784,3,150,2,,2,150,1,143360,1,150,1,147456,1,150,1,159744,1,163840,1,167936,1,150,2,,1,184320,1,192512,1,188416,3,150,1,262144,1,233472,1,223750,1,151,1,229376,1,151,2,150,1,240646,1,252422,1,151,1,258048,1,151,4,150,1,,1,150,1,286720,1,150,1,290816,1,299008,1,150,1,303104,2,150,1,319488,3,150,1,335872,1,364544,1,150,1,356352,5,150,1,375814,1,150,1,393216,4,150,1,397312,6,150,1,,1,150,1,458752,6,150,1,462848,5,150,2,,1,502790,1,150,1,520192,4,150,1,524288,3,150,1,584198,1,561152,4,150,1,565248,3,150,1,598016,1,151,3,150,1,606208,1,150,1,151])
F=rle_dec([1,,22,151,1,98304,3,151,1,114688,2,151,2,,1,151,1,154630,2,151,1,150,5,151,2,,2,151,1,150,1,151,1,200704,4,151,1,150,1,151,1,150,2,151,1,150,1,151,1,150,1,151,1,150,2,151,1,270336,1,151,1,,3,151,1,150,2,151,1,150,1,311296,3,151,1,327680,3,151,1,360448,1,151,1,352256,7,151,1,385024,1,389120,2,151,1,150,1,405504,1,409600,2,151,1,421888,1,151,1,,2,151,1,442368,1,446464,1,450560,1,454656,2,151,1,150,1,471040,1,475136,1,479232,1,483328,1,151,2,,3,151,1,512000,1,516096,2,151,1,150,1,532480,1,536576,3,151,1,552960,1,557056,2,151,1,150,1,573440,1,577536,2,151,1,150,1,593920,4,151,1,150])
D=function(a,i,l,b){for(i=0,l=a.length,b=[];i<l;i++)b[i]=a[i]&&revive(a[i]);return b}([,,,,,,,,,,,,[[[[0,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]]]],[[[[14]]]],[[[[17]]]],[[[[16]]]],,[[[[13]]]],[[[[9]]]],[[[[2]]],[[[1]]]],,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,[[[[10]]]],,,,,,,[[[[10]]]],,,,,,,,,[[[[3]]]],,[[[[3]]]],[[[[10]]]],,,,,[[[[10]]]],,,,,,,,,,,,,[[[[12]]]],,,,,[[[[6,7,8,10]]]],,,,,[[[[6,7,8,10]]]],,,,,,,,,,,[[[[6,15]]]],,,,,,,[[[[6,15]]]],,,[[[[4]]]],,,,,[[[[6,7,11,15,16]]]],,,,,[[[[6,7,11,15,16]]]],,,,,[[[[5,6,7]]]],,,,,[[[[5,6,7]]]],,,,,,,,[[[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]]]]])
function revive(x){var i,l,state,j,l2,all=[],t,ts;if(!x)return;for(i=0,l=x.length;i<l;i++){state=x[i];ts=[];for(j=0,l2=state.length;j<l2;j++){t=state[j];if(t[1]==l) ts.push([t[0],true]);else ts.push([t[0],t[1]==undefined?i+1:t[1]])}all.push(ts)}return dfa(all)
 function dfa(ss){var i,l_ss,st,l_s,t,l_t,a,d=[],j,k,l;for(i=0,l_ss=ss.length;i<l_ss;i++){st=ss[i];a=[];for(j=0,l_s=st.length;j<l_s;j++){t=st[j];for(k=0,l_t=t[0].length;k<l_t;k++){a[t[0][k]]=t[1]===true?l_ss:t[1]}}for(j=0,l=a.length;j<l;j++)if(a[j]==undefined)a[j]=l_ss+1;d[i]=a}
  return function _dfa(st,i){var eq,pr;while(st<l_ss){eq=equiv[s.charCodeAt(i++)];st=d[pr=st][eq]}if(eq==undefined&&i>=s.length){ds=pr;dp=i-1;return}ds=0;dp=undefined;if(st==l_ss){pos=i;return true}return false}}}
if(typeof out=='string'){s=out;out=[];x=parser(function(m,x,y){if(m=='fail')out=[false,x,y,s];if(m=='tree segment')out=out.concat(x)});x('chunk',s);x('eof');return out[0]===false?out:[true,{names:exports.names,tree:out,input:s}]}
return function(m,x){if(failed){out('fail',pos,'parse already failed');return}
switch(m){
case 'chunk':s+=x;l=s.length;while(tbl.length<l+1)tbl.push([]);mainloop();break
case 'eof':eof=true;mainloop();break
default:throw new Error('unhandled message: '+m)}}
//mainloop
function mainloop(){for(;;){
if(dp==undefined&&(S>161||S<152))
t_block:{
if(S&4/*pushpos*/)posns.push(pos)
if(S&2/*t_bufferout*/){bufs.push(buf);buf=[]}
if(S&8/*t_emitstate*/){emps.push(emp);emp=pos;buf.push(S>>>12)}
if(S&1/*cache*/&&(x=tbl[pos-offset][S])!=undefined){if(x){R=true;pos=x[0];buf=x[1];if(emp<x[2])emp=x[2]}else{R=false}}
}
if(R==undefined){
if(D[S>>>12]){R=D[S>>>12](ds||0,dp||pos);if(R==undefined){if(eof){ds=dp=undefined;R=false}else{out('ready');return}}}
else{states.push(S);S=T[S>>>12]}
if(S==152){R=true;S=states.pop()}}
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
if(S==150){R=true;S=states.pop()}else if(S==151){R=false;S=states.pop()}else R=undefined;}}}
function emit(){var x=bufs.length?bufs[0]:buf;if(x.length){out('tree segment',x);if(bufs.length)bufs[0]=[];else buf=[]}}
function fail(s){out('fail',pos,s);failed=1}}
})(typeof exports=='object'?exports:parser={});
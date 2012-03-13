;(function(exports){exports.names=['','Prefix','Server','Person','Nick','User','Host','','SquareBrackets','CurlyBrackets','Backtick','AlphaNum','Letter','Num','','S','_'];exports.parse=prefix
prefix.names=exports.names
function prefix(out){var eof=false,s='',l=0,S=65536,T,M,F,D,R,tbl=[],x,pos=0,offset=0,buf=[],bufs=[],states=[],posns=[],c,equiv,ds,dp,failed=0,emp=0,emps=[];
equiv=rle_dec([32,0,1,1,1,2,8,0,1,3,2,0,1,4,1,5,1,6,10,7,1,8,2,0,1,9,2,0,1,10,26,11,1,12,1,13,1,12,1,13,1,4,1,14,26,11,1,15,1,4,1,15,1,9,55169,0,2048,16,8192,0])
function rle_dec(a){var r=[],i,l,n,x,ll;for(i=0,l=a.length;i<l;i+=2){n=a[i];x=a[i+1];r.length=ll=r.length+n;for(;n;n--)r[ll-n]=x}return r}
T=[,69632,322566,86016,195590,274432,122880,,,,,167936,,,,261126,380928,,77824,11439,15535,19631,97286,98304,102400,23727,98,27823,98,64687,,131072,135168,48303,36015,,151552,155648,48303,36015,,172032,52399,56495,,,,196608,200704,48303,36015,40111,44207,,225280,229376,48303,36015,40111,44207,,,,262144,,270336,,,282624,286720,48303,36015,,303104,307200,48303,36015,,323584,327680,48303,36015,,344064,348160,48303,36015,,364544,368640,23727,27823,64687,7343,389120,]
M=rle_dec([1,,6,96,1,,6,96,1,,2,96,1,73728,3,96,1,90112,1,118784,1,96,1,110592,5,96,1,130054,1,96,1,147456,4,96,1,151552,6,96,3,,1,96,1,221184,6,96,1,225280,5,96,2,,1,96,1,266240,1,96,1,270336,1,281606,1,96,1,299008,4,96,1,303104,3,96,1,363014,1,339968,4,96,1,344064,3,96,1,376832,1,97,3,96,1,385024,1,96,1,97])
F=[,97,97,97,97,97,97,,97,97,97,97,97,97,,97,97,97,97,81920,97,97,97,114688,97,106496,97,97,97,97,97,97,97,139264,143360,97,97,96,159744,163840,97,97,176128,97,,,,97,97,204800,208896,212992,217088,97,97,96,233472,237568,241664,245760,97,,,97,97,97,96,97,97,97,290816,294912,97,97,96,311296,315392,97,97,97,331776,335872,97,97,96,352256,356352,97,97,96,372736,97,97,97,97,96]
D=function(a,i,l,b){for(i=0,l=a.length,b=[];i<l;i++)b[i]=a[i]&&revive(a[i]);return b}([,,,,,,,,[[[[12]]]],[[[[15]]]],[[[[14]]]],,[[[[11]]]],[[[[7]]]],,,,[[[[8]]]],,,,,,,,,,,,,[[[[10]]]],,,,,[[[[4,5,6,8]]]],,,,,[[[[4,5,6,8]]]],,,,,,,,,,,,,[[[[4,13]]]],,,,,,,[[[[4,13]]]],,,,[[[[1]]]],,[[[[1]]]],[[[[2]]]],,,,,[[[[4,5,9,13,14]]]],,,,,[[[[4,5,9,13,14]]]],,,,,[[[[3,4,5]]]],,,,,[[[[3,4,5]]]],,,,,,,,[[[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]]]]])
function revive(x){var i,l,state,j,l2,all=[],t,ts;if(!x)return;for(i=0,l=x.length;i<l;i++){state=x[i];ts=[];for(j=0,l2=state.length;j<l2;j++){t=state[j];if(t[1]==l) ts.push([t[0],true]);else ts.push([t[0],t[1]==undefined?i+1:t[1]])}all.push(ts)}return dfa(all)
 function dfa(ss){var i,l_ss,st,l_s,t,l_t,a,d=[],j,k,l;for(i=0,l_ss=ss.length;i<l_ss;i++){st=ss[i];a=[];for(j=0,l_s=st.length;j<l_s;j++){t=st[j];for(k=0,l_t=t[0].length;k<l_t;k++){a[t[0][k]]=t[1]===true?l_ss:t[1]}}for(j=0,l=a.length;j<l;j++)if(a[j]==undefined)a[j]=l_ss+1;d[i]=a}
  return function _dfa(st,i){var eq,pr;while(st<l_ss){eq=equiv[s.charCodeAt(i++)];st=d[pr=st][eq]}if(eq==undefined&&i>=s.length){ds=pr;dp=i-1;return}ds=0;dp=undefined;if(st==l_ss){pos=i;return true}return false}}}
if(typeof out=='string'){s=out;out=[];x=prefix(function(m,x,y){if(m=='fail')out=[false,x,y,s];if(m=='tree segment')out=out.concat(x)});x('chunk',s);x('eof');return out[0]===false?out:[true,{names:exports.names,tree:out,input:s}]}
return function(m,x){if(failed){out('fail',pos,'parse already failed');return}
switch(m){
case 'chunk':s+=x;l=s.length;while(tbl.length<l+1)tbl.push([]);mainloop();break
case 'eof':eof=true;mainloop();break
default:throw new Error('unhandled message: '+m)}}
//mainloop
function mainloop(){for(;;){
if(dp==undefined&&(S>107||S<98))
t_block:{
if(S&4/*pushpos*/)posns.push(pos)
if(S&2/*t_bufferout*/){bufs.push(buf);buf=[]}
if(S&8/*t_emitstate*/){emps.push(emp);emp=pos;buf.push(S>>>12)}
if(S&1/*cache*/&&(x=tbl[pos-offset][S])!=undefined){if(x){R=true;pos=x[0];buf=x[1];if(emp<x[2])emp=x[2]}else{R=false}}
}
if(R==undefined){
if(D[S>>>12]){R=D[S>>>12](ds||0,dp||pos);if(R==undefined){if(eof){ds=dp=undefined;R=false}else{out('ready');return}}}
else{states.push(S);S=T[S>>>12]}
if(S==98){R=true;S=states.pop()}}
while(R!=undefined){
if(S==65536){(R?emit:fail)();return}if(R){
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
if(S==96){R=true;S=states.pop()}else if(S==97){R=false;S=states.pop()}else R=undefined;}}}
function emit(){var x=bufs.length?bufs[0]:buf;if(x.length){out('tree segment',x);if(bufs.length)bufs[0]=[];else buf=[]}}
function fail(s){out('fail',pos,s);failed=1}}
})(typeof exports=='object'?exports:prefix={});
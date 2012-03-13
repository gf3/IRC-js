;(function(exports){exports.names=['','Mode','Flag','ChannelFlag','UserFlag','_'];exports.parse=mode
mode.names=exports.names
function mode(out){var eof=false,s='',l=0,S=20480,T,M,F,D,R,tbl=[],x,pos=0,offset=0,buf=[],bufs=[],states=[],posns=[],c,equiv,ds,dp,failed=0,emp=0,emps=[];
equiv=rle_dec([43,0,1,1,1,0,1,2,27,0,1,3,5,0,1,4,17,0,1,5,1,6,2,0,1,7,3,0,1,8,1,0,1,9,1,10,1,11,1,12,1,13,1,14,1,15,1,16,1,17,1,18,1,0,1,19,1,20,55176,0,2048,21,8192,0])
function rle_dec(a){var r=[],i,l,n,x,ll;for(i=0,l=a.length;i<l;i+=2){n=a[i];x=a[i+1];r.length=ll=r.length+n;for(;n;n--)r[ll-n]=x}return r}
T=[,24576,53248,,,172032,31750,32768,36864,,,49152,11439,57344,15535,19631,,,,,,,,,,,,,,,,,,,,,,,,,,,7343,180224,]
M=rle_dec([1,,6,45,1,31750,1,45056,3,45,1,49152,3,45,26,,1,176128,1,45,1,46])
F=[,46,46,46,46,46,46,45,46,40960,46,46,45,46,61440,46,,,,,,,,,,,,,,,,,,,,,,,,,,,46,46,45]
D=function(a,i,l,b){for(i=0,l=a.length,b=[];i<l;i++)b[i]=a[i]&&revive(a[i]);return b}([,,,[[[[3]],[[4]],[[5]],[[6]],[[7]],[[8]],[[9]],[[10]],[[11]],[[12]],[[14]],[[15]],[[16]],[[17]],[[18]],[[19]]]],[[[[4]],[[5]],[[8]],[[13]],[[16]],[[17]],[[20]]]],,,,,[[[[1]]]],[[[[2]]]],,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,[[[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]]]]])
function revive(x){var i,l,state,j,l2,all=[],t,ts;if(!x)return;for(i=0,l=x.length;i<l;i++){state=x[i];ts=[];for(j=0,l2=state.length;j<l2;j++){t=state[j];if(t[1]==l) ts.push([t[0],true]);else ts.push([t[0],t[1]==undefined?i+1:t[1]])}all.push(ts)}return dfa(all)
 function dfa(ss){var i,l_ss,st,l_s,t,l_t,a,d=[],j,k,l;for(i=0,l_ss=ss.length;i<l_ss;i++){st=ss[i];a=[];for(j=0,l_s=st.length;j<l_s;j++){t=st[j];for(k=0,l_t=t[0].length;k<l_t;k++){a[t[0][k]]=t[1]===true?l_ss:t[1]}}for(j=0,l=a.length;j<l;j++)if(a[j]==undefined)a[j]=l_ss+1;d[i]=a}
  return function _dfa(st,i){var eq,pr;while(st<l_ss){eq=equiv[s.charCodeAt(i++)];st=d[pr=st][eq]}if(eq==undefined&&i>=s.length){ds=pr;dp=i-1;return}ds=0;dp=undefined;if(st==l_ss){pos=i;return true}return false}}}
if(typeof out=='string'){s=out;out=[];x=mode(function(m,x,y){if(m=='fail')out=[false,x,y,s];if(m=='tree segment')out=out.concat(x)});x('chunk',s);x('eof');return out[0]===false?out:[true,{names:exports.names,tree:out,input:s}]}
return function(m,x){if(failed){out('fail',pos,'parse already failed');return}
switch(m){
case 'chunk':s+=x;l=s.length;while(tbl.length<l+1)tbl.push([]);mainloop();break
case 'eof':eof=true;mainloop();break
default:throw new Error('unhandled message: '+m)}}
//mainloop
function mainloop(){for(;;){
if(dp==undefined&&(S>50||S<47))
t_block:{
if(S&4/*pushpos*/)posns.push(pos)
if(S&2/*t_bufferout*/){bufs.push(buf);buf=[]}
if(S&8/*t_emitstate*/){emps.push(emp);emp=pos;buf.push(S>>>12)}
if(S&1/*cache*/&&(x=tbl[pos-offset][S])!=undefined){if(x){R=true;pos=x[0];buf=x[1];if(emp<x[2])emp=x[2]}else{R=false}}
}
if(R==undefined){
if(D[S>>>12]){R=D[S>>>12](ds||0,dp||pos);if(R==undefined){if(eof){ds=dp=undefined;R=false}else{out('ready');return}}}
else{states.push(S);S=T[S>>>12]}
if(S==47){R=true;S=states.pop()}}
while(R!=undefined){
if(S==20480){(R?emit:fail)();return}if(R){
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
if(S==45){R=true;S=states.pop()}else if(S==46){R=false;S=states.pop()}else R=undefined;}}}
function emit(){var x=bufs.length?bufs[0]:buf;if(x.length){out('tree segment',x);if(bufs.length)bufs[0]=[];else buf=[]}}
function fail(s){out('fail',pos,s);failed=1}}
})(typeof exports=='object'?exports:mode={});
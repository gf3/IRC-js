/* PanPG 0.0.9
 * PEG → JavaScript parser generator, with its dependencies.
 * built on Fri, 22 Oct 2010 03:59:43 GMT
 * See http://boshi.inimino.org/3box/PanPG/about.html
 * MIT Licensed
 */

;(function(exports){



/* API_compiling.js */

function generateParser(peg,opts,_opts){var x
 x=generateParserAlt(peg,opts,_opts)
 if(!x[0])throw x[1]
 return x[1]}

function generateParserAlt(peg,opts,_opts){var parse_result,named_res,i,l,patch,pr,nr
 opts=opts||{}
 if(peg instanceof Array){
  opts.patches=peg.slice(1)
  peg=peg[0]}
 parse_result=parsePEG(peg)
 if(!parse_result[0])return [0,new Error(showError(parse_result))]
 named_res=v6_named_res(parse_result)
 if(opts.patches)
  for(i=0,l=opts.patches.length;i<l;i++){patch=opts.patches[i]
   pr=parsePEG(patch)
   if(!pr[0])return pr
   nr=v6_named_res(pr)
   named_res=apply_patch(named_res,nr)}
 try{return [1,codegen_v6(opts,named_res,_opts)]}
 catch(e){return [0,e]}
 function apply_patch(nr1,nr2){var o={},i,l,name,rule,ret=[]
  for(i=0,l=nr1.length;i<l;i++){
   name=nr1[i][0]
   ret[i]=nr1[i]
   o[name]=i}
  for(i=0,l=nr2.length;i<l;i++){
   name=nr2[i][0]
   // if it was already there, replace it
   if(o.hasOwnProperty(name)) ret[o[name]]=nr2[i]
   // otherwise add it at the end
   else ret.push(nr2[i])}
  return ret}}



/* API_debugging.js */

function checkTrace(msgs){var i,l,m
 ,msg,S,pos,R,stack,posns,bufs,buf // regex captures
 ,calls=[],callstack=[],call,notes=[],prev_state,parser_is_resuming
 for(i=0,l=msgs.length;i<l;i++){
  if(m=/^(\w+)\s+S:(\S+) pos:(\d+) R:(\S+) stack:((?:,?\d+)*) posns:(\S*) bufs:(\S*) buf:(.*)/.exec(msgs[i])){
   msg=m[1],S=m[2],pos=m[3],R=m[4],stack=m[5],posns=m[6],bufs=m[7],buf=m[8]


   if(msg=='main'){
    if(parser_is_resuming){
         calls.push({resuming:true})}
    else{
         call={depth:callstack.length,expr:S,start:pos,main_stack:stack
              ,main_posns:posns,main_bufs:bufs}
         calls.push(call)
         callstack.push(call)}}


   if(msg=='test'){
        if(parser_is_resuming){
         if(!equal_states(msgs[i],prev_state)){
          calls.push({error:'parser resumed in a different state'
                            +msgs[i]+' '+prev_state})}}
        prev_state=msgs[i]
        if(!call){calls.push({error:'test without main'});continue}
        call.test_posns=posns
        call.test_bufs=bufs
        parser_is_resuming=false}}


   if(msg=='result'){
        call=callstack.pop()
        if(!call){/*calls.push({error:'empty stack'});*/continue}
        call.result=R
        call.end=pos
        //if(S != call.expr) call.expr = 'XXX:' + call.expr + '!=' + S
        call.result_stack=stack
        call.result_posns=posns
        call.result_bufs=bufs}


   if(msg=='res_end'){
        call=callstack[callstack.length-1]
        if(!call){calls.push({error:'empty stack'});continue}
        call.res_end_bufs=bufs}


  if(m=/^ready/.exec(msgs[i])){
   // after requesting a chunk a parser should resume in the same state
   parser_is_resuming=true}}
 return calls.map(show).join('\n')
 function equal_states(a,b){
  return a.replace(/ . R/,'  R')
          .replace(/dp:\S*/,'')
      == b.replace(/dp:\S*/,'')}
 function show(call){var indent
  if(call.error)return 'ERROR: '+call.error
  if(call.resuming)return '────────┤chunk├────────'
  indent=Array(call.depth+1).join(' ').replace(/.../g,'  ↓')
  if(call.result==undefined)return indent + call.expr + ' [?]'
  return indent
       + call.expr
       + ' '+call.start+'→'+call.end+''
       + ' '+(call.stack_before==call.stack_after?''
               :'XXX:changed stack '+call.stack_before+'→'+call.stack_after)
       + (call.test_posns? // won't exist if it was cached
          (call.test_posns==call.result_posns?'':' XXX: changed position stack')
          :'')
       + (call.test_bufs?
          (call.test_bufs==call.result_bufs?'':' XXX: changed bufs stack')
          :'')
       + (call.result=='false'?' [x]':'')}}

function explain(grammar,opts,input,verbosity){var either_error_parser,parser,trace,streaming_parser,tree,e,result,fail,fail_msg
 // generate a parser
 opts=extend({},opts)
 opts.fname='trace_test'
 opts.trace=true
 if(verbosity>2) opts.debug=true // if code will be shown, generate the big top comment
 //opts.asserts=true
 //if(verbosity>1) opts.show_trace=true
 //if(verbosity>2) opts.show_code=true
 either_error_parser=memoized(grammar)
 if(!either_error_parser[0])return'Cannot generate parser: '+either_error_parser[1]
 try{parser=eval(either_error_parser[1]+'\n;'+opts.fname)}
 catch(e){return 'The parser did not eval() cleanly (shouldn\'t happen): '+e.toString()}

 // parse the input
 trace=[],tree=[]
 streaming_parser=parser(message_handler)
 function message_handler(m,x,y,z){
  spaces='                '.slice(m.length)
  trace.push(m+spaces+x+(y?' '+y:''))
  if(m=='tree segment')tree=tree.concat(x)
  if(m=='fail')fail=[m,x,y,z]}
 try{
  streaming_parser('chunk',input)
  streaming_parser('eof')}
 catch(except){e=except}
 if(fail){try{fail_msg=showError.apply(null,fail)}catch(e){}}
 result=e?'The parser threw an exception:'+'\n\n'+(e.stack?e+'\n\n'+e.stack:e)
         :fail?'Parse failed: '+fail_msg
              :'Parser consumed the input.'
 // explain the result
 return [input
        ,'input length '+input.length
        ,'result: '+result
        ,'tree:\n'+showTree([true,{tree:tree,input:input,names:parser.names}])
        ,'trace analysis:\n'+checkTrace(trace)
        ,'legend:\n'+parser.legend
        ,verbosity>1?'trace:\n'+trace.join('\n'):''
        ,verbosity>2?'parser code:\n'+either_error_parser[1]:''
        ,verbosity>3?'raw tree:\n'+tree.join():''
        ].filter(function(x){return x!=''})
         .join('\n\n')

 // helpers
 function memoized(grammar){var cache,cached
  cache = explain.cache = explain.cache || {}
  cached = cache[grammar]
  if(!cached || !deepEq(cached[0],opts)) cached = cache[grammar] = [opts,generateParserAlt(grammar,opts)]
  return cached[1]}
 function extend(a,b){for(var p in b)a[p]=b[p];return a}
 function deepEq(x,y){var p
  if(x===y)return true
  if(typeof x!='object' || typeof y!='object')return false
  for(p in x)if(!deepEq(x[p],y[p]))return false
  for(p in y)if(!(p in x))return false
  return true}}



/* API_support.js */

// (event array (can be partial), [name array], [input string], [state]) → [ascii-art tree, state]
// -or-
// (complete event array, [name array], [input string]) → ascii-art
// if the event array doesn't describe a complete, finished tree, or if the state value argument is provided, then the ascii-art and the state value will be returned as an array
// this is for examining partial tree fragments as they are generated by a streaming parser

function showTree(res,opts,state){var names,str,a,i,l,indent,name,x,out=[],output_positions=[],node,out_pos,state_was_passed
 if(!res[0])return showError(res)
 res=res[1]
 names=res.names
 a=res.tree
 str=res.input
 opts=opts||{}
 opts.elide=opts.elide||['anonymous']
 opts.drop=opts.drop||[]
 state_was_passed=!!state
 state=state||{stack:[],indent:'',pos:0,drop_depth:0}
 for(i=0,l=a.length;i<l;i++){x=a[i]
  if(x>0){
   if(names){
    name=names[x]
    if(!name) return err('no such rule index in name array: '+x)}
   else name=''+x
   output_positions[state.stack.length]=out.length
   node={index:x,name:name,start:state.pos}
   if(opts.drop.indexOf(name)>-1)state.drop_depth++
   out.push(show(state,node))
   state.indent+=' '
   state.stack.push(node)}
  else if(x==-1){
   i++
   if(i==l){i--;return}
   node={name:'anonymous',start:state.pos,end:state.pos+a[i]}
   state.pos=node.end
   out.push(show(state,node))
   }
  else if(x==-2){
   i++
   if(i==l)return err('incomplete close event, expected length at position '+i+' but found end of input array')
   y=state.stack.pop()
   state.pos=y.end=y.start+a[i]
   out_pos=output_positions[state.stack.length]
   state.indent=state.indent.slice(0,-1)
   if(out_pos!=undefined){
    out[out_pos]=show(state,y)}
   if(opts.drop.indexOf(y.name)>-1)state.drop_depth--}
  else return err('invalid event '+x+' at position '+i)}
 if(state_was_passed || state.stack.length) return [out.join(''),state]
 else return out.join('')
 function err(s){return ['showTree: '+s]}
 function show(state,node){var text='',main,indent,l
  if(opts.elide.indexOf(node.name)>-1)return ''
  if(state.drop_depth)return ''
  if(node.end!=undefined && str){
   text=show_str(str.slice(node.start,node.end))}
  main=state.indent+node.name+' '+node.start+'-'+(node.end==undefined?'?':node.end)
  l=main.length
  indent=Array(32*Math.ceil((l+2)/32)-l).join(' ')
  return main+indent+text+'\n'}
 function show_str(s){
  return '»'+s.replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/(.{16}).{8,}/,"$1…")+'«'}}

// inspired by: http://gist.github.com/312863
function showError(res){var line_number,col,lines,line,start,end,prefix,suffix,arrow,pos,msg,str
 pos=res[1];msg=res[2];str=res[3]
 msg=msg||'Parse error'
 if(str==undefined)return msg+' at position '+pos
 prefix=str.slice(0,pos)
 suffix=str.slice(pos)
 line_number=prefix.split('\n').length
 start=prefix.lastIndexOf('\n')+1
 end=suffix.indexOf('\n')
 if(end==-1) end=str.length
 else end=prefix.length+end
 line=str.slice(start,end)
 line=line.replace(/\t/g,' ')
 col=pos-start
 arrow=Array(col).join('-')+'^'
 return msg+' at line '+line_number+' column '+col+'\n'+line+'\n'+arrow}

function showResult(r,opts){
 if(r[0])return showTree(r,opts)
 return showError(r)}

function treeWalker(dict,result){var p,any,anon,other,fail,except,index,cb=[],stack=[],frame,pos=0,i,l,x,retval,events,begin=[],match,target,msg
 fail=dict.fail
 except=dict.exception
 if(!result[0]){
  msg='parse failed: '+result[1]+' '+(result[2]||'')
  if(fail)return fail(result)||msg
  return err(msg)}
 result=result[1]
 names=result.names
 events=result.tree
 for(p in dict) if(dict.hasOwnProperty(p)){
  if(p=='any'){any=dict[p];throw new Error('unimplemented, use `other` instead')}
  if(p=='anonymous'||p=='anon'){anon=dict[p];continue}
  if(p=='other'){other=dict[p];continue}
  if(p=='fail'){fail=dict[p];continue}
  if(p=='exception'){except=dict[p];continue}
  if(p=='warn'){continue}
  target=cb
  if(match=/(.*) start/.exec(p)){p=m[1];target=begin}
  index=names.indexOf(p)
  if(index==-1)return err('rule not found in rule names: '+p)
  target[index]=dict[p]}
 frame={cn:[]}
 for(i=0,l=events.length;i<l;i++){x=events[i]
  if(x>0){ // named rule start
   stack.push(frame)
   frame={index:x,start:pos}
   if(begin[x]){
    try{retval=begin[x](pos)}
    // here we call err() but continue iff `except` returns true
    catch(e){if(!err('exception in '+names[x]+' start:'+e))return}}
   if(cb[x]||any||other) frame.cn=[]}
  else if(x==-1){ // anonymous node
   i++
   if(i==l)return err('incomplete anonymous node')
   if(anon)anon(m(pos,pos+events[i]))
   pos+=events[i]}
  else if(x==-2){ // node close
   i++
   if(i==l)return err('incomplete rule close')
   pos=frame.start+events[i]
   x=frame.index
   match=m(frame.start,pos)
   try{
    if(cb[x])     retval=cb[x](match,frame.cn)
    else if(other)retval=cb[x](match,frame.cn,names[x])}
   catch(e){return err('exception in '+names[x]+': '+e+' (on node at char '+match.start+'-'+match.end+')')}
   frame=stack.pop() // the parent node
   if(cb[x] && retval!==undefined)
    if(frame.cn)frame.cn.push(retval)
    else warn('ignored return value of '+names[x]+' in '+names[frame.index])}
  else return err('invalid event stream (saw '+x+' at position '+i+')')}
 if(frame.cn)return frame.cn[0]
 function m(s,e){
  return {start:s
         ,end:e
         ,text:function(){return result.input.slice(s,e)}}}
 function err(s){
  if(except)return except(s)
  throw new Error('treeWalker: '+s)}
 function warn(s){
  if(dict.warn)dict.warn(s)}}



/* parsePEG.js */

parsePEG.names=['','RuleSet','Comment','Rule','PropSpec','UPlusCodePoint','PositiveSpec','NegativeSpec','CodePoint','CodePointLit','CodePointFrom','CodePointTo','CodePointRange','UnicodePropSpec','CodePointExpr','CharSetUnion','HEXDIG','CharSetDifference','CharEscape','CharSetExpr','StrLit','CharSet','PosCharSet','NegCharSet','Epsilon','AtomicExpr','ParenthExpr','Replicand','N','M','Optional','MNRep','PosRep','AnyRep','SeqUnit','Sequence','IdentChar','IdentStartChar','OrdChoice','S','SpaceAtom','LB','NonTerminal','PosLookahead','NegLookahead','_']
function parsePEG(out){var eof=false,s='',l=0,S=184320,T,M,F,D,R,tbl=[],x,pos=0,offset=0,buf=[],bufs=[],states=[],posns=[],c,equiv,ds,dp,failed=0,emp=0,emps=[];
equiv=rle_dec([10,0,1,1,2,0,1,2,18,0,1,3,1,4,1,5,3,0,1,6,1,0,1,7,1,8,1,9,1,10,1,11,1,12,1,0,1,13,10,14,1,15,1,16,1,17,2,0,1,18,1,0,6,19,14,20,1,21,5,20,1,22,1,23,1,24,1,25,1,26,1,0,2,26,1,27,1,26,1,28,1,29,7,26,1,29,1,26,1,30,1,26,1,29,1,26,1,31,1,26,1,29,1,26,1,32,2,26,1,33,1,0,1,34,34,0,1,35,852,0,1,36,4746,0,1,35,397,0,1,35,2033,0,11,35,36,0,1,35,47,0,1,35,304,0,1,37,129,0,1,38,3565,0,1,35,43007,0,2048,39,8192,0])
function rle_dec(a){var r=[],i,l,n,x,ll;for(i=0,l=a.length;i<l;i+=2){n=a[i];x=a[i+1];r.length=ll=r.length+n;for(;n;n--)r[ll-n]=x}return r}
T=[,188416,266240,299008,949254,818182,965638,916486,765952,780806,892928,897024,880640,901120,749568,720896,,659456,1052672,643072,1028096,589824,991232,605190,,569344,1114112,557056,1171456,1163264,1187840,1126400,1204224,548864,512000,465926,,,356352,429062,442368,278528,335872,1196032,1179648,1212416,195590,196608,200704,171183,208896,11439,15535,224262,228358,229376,171183,237568,171183,245760,11439,15535,258048,171183,301,,274432,,285702,,,,,175279,162991,311296,,,,,162991,158895,154799,344064,150703,,,360448,162991,301,146607,376832,162991,301,392198,393216,,401408,162991,301,146607,417792,162991,301,430080,167087,438272,167087,446464,,454656,171183,,470022,471040,142511,479232,162991,301,494598,495616,142511,503808,162991,301,516096,138415,134319,130223,126127,109743,179375,183471,105647,113839,,561152,109743,105647,573440,101551,89263,175279,85167,593920,97455,93359,,,,618496,162991,301,630784,81071,301,,72879,651264,162991,301,64687,670726,671744,162991,679936,,,,,,,,,162991,64687,60591,732166,733184,737280,162991,301,60591,753664,56495,52399,36015,770048,23727,40111,785414,,,,,,,,,,,,831488,68783,68783,68783,68783,855046,856064,68783,864256,68783,301,301,,44207,,48303,36015,36015,905216,27823,31919,,,,,19631,,,,950272,,958464,,,,,19631,,,,,999424,162991,301,1011712,81071,301,,,,1036288,1040384,76975,,,1059846,1060864,,1069056,68783,68783,68783,68783,301,,,,,,,,158895,,113839,,122031,1145862,1146880,,117935,301,,1167360,,1175552,,,142511,113839,,,142511,113839,,7343,1220608]
M=rle_dec([1,,47,299,1,204800,1,200704,1,217088,2,299,1,253952,1,224262,1,241664,1,233472,1,299,1,237568,4,299,1,258048,1,299,1,270336,1,299,1,274432,2,299,2,,1,299,1,303104,1,307200,1,327680,2,299,2,,1,331776,1,299,1,339968,1,299,1,344064,2,,1,368640,2,299,1,372736,1,385024,3,299,1,392198,1,397312,1,409600,2,299,1,413696,4,299,1,434176,1,299,1,438272,3,299,1,458752,2,299,1,487424,1,475136,4,299,1,494598,1,499712,12,299,1,552960,12,299,1,614400,2,,1,626688,2,299,1,638976,3,299,1,647168,3,299,1,663552,1,299,1,670726,1,675840,1,712704,2,299,6,,1,716800,1,299,1,724992,1,299,1,732166,1,745472,10,299,1,811008,1,300,6,,1,299,1,830470,2,,1,299,1,835584,1,839680,1,843776,1,847872,2,299,1,860160,4,299,1,,1,884736,1,888832,6,299,1,929792,3,,1,936966,1,299,2,,1,299,1,954368,1,299,1,958464,1,974848,2,,1,982022,1,299,2,,1,995328,1,1007616,2,299,1,1019904,3,299,1,,1,1032192,1,1048576,1,1036288,5,299,1,1068038,1,299,1,1073152,1,1077248,1,1081344,1,1085440,2,299,2,,1,299,2,,1,1118208,1,1122304,1,299,1,1130496,1,1134592,1,1138688,1,1159168,1,299,1,1150976,4,299,1,1167360,1,299,1,1175552,1,1183744,1,299,1,1191936,1,299,1,1200128,1,299,1,1208320,1,299,1,1216512,1,299,1,300])
F=rle_dec([1,,46,300,1,262144,1,300,1,299,1,300,1,212992,2,300,1,299,3,300,1,299,1,300,1,249856,2,300,1,299,3,300,1,299,1,300,1,294912,2,,4,300,1,318470,1,300,2,,4,300,1,299,2,,1,300,1,364544,3,300,1,380928,2,300,1,299,2,300,1,405504,3,300,1,421888,4,300,1,299,1,300,1,453638,7,300,1,483328,2,300,1,299,2,300,1,507904,2,300,1,520192,1,524288,1,528384,1,532480,1,536576,1,540672,1,544768,4,300,1,565248,2,300,1,577536,1,581632,1,585728,2,300,1,598016,2,300,2,,1,300,1,622592,2,300,1,634880,4,300,1,655360,3,300,1,299,2,300,1,687110,1,300,6,,4,300,1,299,1,300,1,741376,3,300,1,757760,1,761856,2,300,1,774144,2,300,1,299,6,,2,300,2,,6,300,1,872448,2,300,1,868352,2,300,1,,6,300,1,909312,2,300,3,,2,300,2,,3,300,1,299,1,300,2,,2,300,2,,2,300,1,1003520,2,300,1,1015808,2,300,1,,2,300,1,299,1,1044480,3,300,1,1092614,7,300,1,1104902,2,,1,300,2,,7,300,1,1155072,5,300,1,299,1,300,1,299,10,300,1,299])
D=function(a,i,l,b){for(i=0,l=a.length,b=[];i<l;i++)b[i]=a[i]&&revive(a[i]);return b}([,,,,,,,,,,,,,,,,[[[[14,19]]]],,,,,,,,[[[[36]]]],,,,,,,,,,,,[[[[14,19,20,21,26,27,28,29,30,31,32]]]],[[[[19,20,21]]]],,,,,,,,,,,,,,,,,,,,,,,,,,,,[[[[16]]]],,[[[[0,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38]]]],,[[[[2]]],[[[1]]]],,,[[[[1,2]]]],,,,[[[[37]]]],[[[[17]]],[[[12]]]],,,,,,,,,,,,,,,,,,,[[[[13]]]],,,,,,,,,,,,,[[[[3]]]],,,[[[[3]]]],,,,,,,,,,,,,,,,,,,,,,,[[[[9]]]],,,,,,,,,,,,[[[[22]]],[[[25]]]],,,,,,,,,[[[[24]]]],,,,,,,,,,[[[[38]]]],[[[[28]]],[[[32]]],[[[27]]],[[[28]]],[[[30]]],[[[31]]]],,,,,,,,,,,,,,,,,,,,,,,,[[[[28]]],[[[32]]],[[[27]]],[[[28]]],[[[30]]],[[[31]]]],,,,,,,[[[[0,1,2,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,25,26,27,28,29,30,31,32,33,34,36,37]]]],[[[[21]]],[[[10]]]],,,,,,,,,,,,,,,,,[[[[12]]]],,,,,,,[[[[22]]],[[[15]]],[[[25]]]],,,,,[[[[15]]],[[[24]]]],,,,[[[[3,12,19,20,21,26,27,28,29,30,31,32]]]],,[[[[3,12,19,20,21,26,27,28,29,30,31,32]]]],[[[[22]]],[[[15]]]],,,,[[[[15]]],[[[24]]]],,,[[[[22]]]],,,,,,,[[[[24]]]],,[[[[5]]]],,,,[[[[0,1,2,3,4,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38]]]],[[[[5]]]],,,[[[[23]]]],,,,,,,[[[[23]]],[[[29,31]]]],,,[[[[23]]],[[[5]]]],,,[[[[7]]]],,[[[[8]]]],,[[[[33]]]],,,,[[[[11]]]],,,[[[[34]]]],,[[[[14]]]],,[[[[14]]]],[[[[4]]]],,,[[[[18]]]],[[[[6]]]],,,[[[[10]]]],,,[[[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38]]]]])
function revive(x){var i,l,state,j,l2,all=[],t,ts;if(!x)return;for(i=0,l=x.length;i<l;i++){state=x[i];ts=[];for(j=0,l2=state.length;j<l2;j++){t=state[j];if(t[1]==l) ts.push([t[0],true]);else ts.push([t[0],t[1]==undefined?i+1:t[1]])}all.push(ts)}return dfa(all)
 function dfa(ss){var i,l_ss,st,l_s,t,l_t,a,d=[],j,k,l;for(i=0,l_ss=ss.length;i<l_ss;i++){st=ss[i];a=[];for(j=0,l_s=st.length;j<l_s;j++){t=st[j];for(k=0,l_t=t[0].length;k<l_t;k++){a[t[0][k]]=t[1]===true?l_ss:t[1]}}for(j=0,l=a.length;j<l;j++)if(a[j]==undefined)a[j]=l_ss+1;d[i]=a}
  return function _dfa(st,i){var eq,pr;while(st<l_ss){eq=equiv[s.charCodeAt(i++)];st=d[pr=st][eq]}if(eq==undefined&&i>=s.length){ds=pr;dp=i-1;return}ds=0;dp=undefined;if(st==l_ss){pos=i;return true}return false}}}
if(typeof out=='string'){s=out;out=[];x=parsePEG(function(m,x,y){if(m=='fail')out=[false,x,y,s];if(m=='tree segment')out=out.concat(x)});x('chunk',s);x('eof');return out[0]===false?out:[true,{names:parsePEG.names,tree:out,input:s}]}
return function(m,x){if(failed){out('fail',pos,'parse already failed');return}
switch(m){
case 'chunk':s+=x;l=s.length;while(tbl.length<l+1)tbl.push([]);mainloop();break
case 'eof':eof=true;mainloop();break
default:throw new Error('unhandled message: '+m)}}
//mainloop
function mainloop(){for(;;){
if(dp==undefined&&(S>328||S<301))
t_block:{
if(S&4/*pushpos*/)posns.push(pos)
if(S&2/*t_bufferout*/){bufs.push(buf);buf=[]}
if(S&8/*t_emitstate*/){emps.push(emp);emp=pos;buf.push(S>>>12)}
if(S&1/*cache*/&&(x=tbl[pos-offset][S])!=undefined){if(x){R=true;pos=x[0];buf=x[1];if(emp<x[2])emp=x[2]}else{R=false}}
}
if(R==undefined){
if(D[S>>>12]){R=D[S>>>12](ds||0,dp||pos);if(R==undefined){if(eof){dp=undefined;R=false}else{out('ready');return}}}
else{states.push(S);S=T[S>>>12]}
if(S==301){R=true;S=states.pop()}}
while(R!=undefined){
if(S==184320){(R?emit:fail)();return}if(R){
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
if(S==299){R=true;S=states.pop()}else if(S==300){R=false;S=states.pop()}else R=undefined;}}}
function emit(){var x=bufs.length?bufs[0]:buf;if(x.length){out('tree segment',x);if(bufs.length)bufs[0]=[];else buf=[]}}
function fail(s){out('fail',pos,s);failed=1}}



/* re.js */

/* Here we define an 're' type and operations on it.  These are like regular expressions, except that they are stored not as strings but in a more convenient format.  They may be operated on and combined in various ways and eventually may be converted into ECMAScript regexes.  An re object can also be a named reference, to some other re object, which means that a set of re objects can be recursive and can express non-regular languages.  Circular re objects cannot be turned into ECMAScript regexes, although some collections of re objects that contain named references but are not circular can be flattened by substitution. */

/* An re is an array, in which the first element is an integer which encodes the type of the second element:

0 → cset
1 → string literal
2 → sequence of res
3 → union of res
4 → m to n reps of re
5 → named reference
6 → re negative lookahead
7 → re positive lookahead

*/

function re_from_cset(cset){return [0,cset]}

function re_from_str(str){return [1,str]}

function re_sequence(res){return res.length>1 ?[2,res] :res[0]}

function re_union(res){return res.length>1 ?[3,res] :res[0]}

function re_rep(m,n,re){return [4,m,n,re]}

function re_reference(name){return [5,name]}

function re_neg_lookahead(re){return [6,re]}

function re_pos_lookahead(re){return [7,re]}

/* the following needs a correctness proof. */
function re_serialize(re){
 return f(re)
 function f(re){return h(re,1)}// wants parens
 function g(re){return h(re,0)}// doesn't
 function h(re,paren){var q,cs
  switch(re[0]){
  case 0:
   return CSET.toRegex(re[1])
  case 1:
   return reEsc(re[1].slice(1,-1)) // defined in primitives.js
  case 2:
   return re[1].map(f).join('')
  case 3:
   return (!paren || re[1].length<2)
            ?    re[1].map(f).join('|')
            :'('+re[1].map(g).join('|')+')'
  case 4:
   if(re[1]==0){
    if     (re[2]==0) q='*'
    else if(re[2]==1) q='?'}
   else if(re[1]==1 && re[2]==0) q='+'
   else q='{'+re[1]+','+re[2]+'}'
   return '('+g(re[3])+')'+q
  case 5:
   throw Error('re_serialize: cannot serialize named reference')
  case 6:
   return '(?!'+g(re[1])+')'
  case 7:
   return '(?='+g(re[1])+')'
  default:
   throw Error('re_serialize: unknown re type: '+re[0])}}}

function re_simplify(re){var r
 switch(re[0]){
 case 0:
 case 1:
  return re
 case 2:
  r=[2,re[1].map(re_simplify)]
  return r
 case 3:
  r=[3,re[1].map(re_simplify)]
  if(r[1].every(function(r){return r[0]===0})){
   cs=r[1][0][1]
   r[1].slice(1).forEach(function(r){cs=CSET.union(cs,r[1])})
   return [0,cs]}
  return r
 case 4:
  return [4,re[1],re[2],re_simplify(re[3])]
 case 5:
  throw Error('re_simplify: cannot simplify named reference')
 case 6:
  r=re_simplify(re[1])
  //if(r[0]===0)return [0,CSET.complement(r[1])] WRONG
  return [6,r]
 case 7:
  return [7,re_simplify(re[1])]
 default:
  throw Error('re_simplify: unknown re type: '+re[0])}}

/* we return either a string which is a dependency of the provided re object, or undefined if the re is self-contained. */
function re_dependency(re){var i,l,r
 switch(re[0]){
 case 0:
 case 1:
 case 8:
  return
 case 2:
 case 3:
  for(i=0,l=re[1].length;i<l;i++)
   if(r=re_dependency(re[1][i]))return r
  return
 case 4:
  return re_dependency(re[3])
 case 5:
  return re[1]
 case 6:
 case 7:
  return re_dependency(re[1])
 default:
  throw Error('re_dependency: unknown re type: '+re[0])}}

function re_substitute(re,name,value){var i,l
 switch(re[0]){
 case 0:
 case 1:
  return re
 case 2:
 case 3:
  for(i=0,l=re[1].length;i<l;i++)
   re[1][i]=re_substitute(re[1][i],name,value)
  return re
 case 4:
  re[3]=re_substitute(re[3],name,value)
  return re
 case 5:
  if(re[1]===name)return value
  return re
 case 6:
 case 7:
  re[1]=re_substitute(re[1],name,value)
  return re
 default:
  throw Error('re_substitute: unknown re type: '+re[0])}}

/*
6 → re negative lookahead
7 → re positive lookahead
*/

function re_to_function(ctx){return function(re){
 return f(re)
 function f(re){
  switch(re[0]){
   case 0:
    return 'cs_'+cset_ref(ctx,re[1])
   case 1:
    if(!re[1].length)return 'empty'
    return 'sl_'+strlit_ref(ctx,re[1])
   case 2:
    return 'seq('+re[1].map(f).join(',')+')'
   case 3:
    return 'ordChoice('+re[1].map(f).join(',')+')'
   case 4:
    return 'rep('+re[1]+','+re[2]+','+f(re[3])+')'
   case 5:
    return re[1]
   }
  return re}}
 function cset_ref(ctx,cset){var x
  if(x=lookup(cset,ctx.csets,cset_test))return x
  x=ctx.csets.length
  ctx.csets[x]=cset_f(cset,x)
  return x}
 function lookup(x,xs,eq){
  }
 function cset_test(a,b){
  }
 function cset_f(cset,n){
  return 'function cs_'+n+'(s){var c;'
  + 'c=s._str.charCodeAt(s.pos);'
  + 'if('+cset_to_expr(cset,'c')+'){s.adv(1);return true}'
  + 'return false'
  + '}'}
 function strlit_ref(ctx,str){
  if(x=lookup(ctx.strlits,str))return x
  x=ctx.strlits.length
  ctx.strlits[x]=strlit_f(str,x)
  return x}
 function strlit_f(str,n){var i,l,ret,ret2
  l=str.length
  if(l>8){
   return 'function sl_'+n+'(s){var x;'
   + 'x=s._str.slice'
   + '}'}
  else{
   ret=['function sl_'+n+'(s){var '
   ,'p=s.pos'
   ,',t=s._str;'
   ,'if(']
   ret2=[]
   for(i=0;i<l;i++)
    ret2.push('t.charCodeAt(p'+(i<l-1?'++':'')+')=='+str.charCodeAt(i))
   ret.push(ret2.join('&&'))
   ret.push('){s.adv('+str.length+');return true}')
   ret.push('return false}')
   return ret.join('')}}}

/* probably belongs in CSET */
/* takes a cset and a variable name to a JavaScript expression which is a test on the value of that variable for membership in that cset. */
/* This is a dumb implementation, but has the advantage of favoring small codepoints; much more efficient implementations are possible. */
function cset_to_expr(cset,id){var i,l,ret=[]
 for(i=0,l=cset.length;i<l;i++)
  ret.push(id+'<'+cset[i]+'?'+(i%2?'1':'0')+':')
 ret.push(l%2?'1':'0')
 return ret.join('')}




/* lists.js */

function foldl1(f,a){var x,i,l
 x=a[0]
 for(i=1,l=a.length;i<l;i++)x=f(x,a[i])
 return x}

function foldl(f,a,x){var i,l
 for(i=0,l=a.length;i<l;i++)x=f(x,a[i])
 return x}

// [[a]] → [a]
function concat(as){var i,l,a=[]
 for(i=0,l=as.length;i<l;i++)
  a.push.apply(a,as[i])
 return a}

function uniq(a){
 return a.filter(function(e,i,a){return !i||e!==a[i-1]})}

function max(a){
 return foldl(f,a,-Infinity)
 function f(a,b){return Math.max(a,b)}}

function min(a){
 return foldl(f,a,Infinity)
 function f(a,b){return Math.min(a,b)}}

function sum(a){
 return foldl(f,a,0)
 function f(a,b){return a+b}}

function product(a){
 return foldl(f,a,1)
 function f(a,b){return a*b}}

// String → Object → a
function access(prop){return function(o){return o[prop]}}

/* [[name,value]] → Object */
function objectFromList(a){var o={}
 a.forEach(function(e){
  o[e[0]]=e[1]})
 return o}

/* [a], [b] → [[a,b]] */
function zip(a,b){var r=[],i,l
 l=Math.min(a.length,b.length)
 for(i=0;i<l;i++) r.push([a[i],b[i]])
 return r}

/* [a] → a */
function last(a){return a[a.length-1]}

function fst(a){return a[0]}
function snd(a){return a[1]}



/* util.js */

/* Various debugging utilities and convenience functions */

function dir(o){var a=[],p;for(p in o){a.push(p)}return a.sort().join('\n')}

function test_pp(){
 var a=[],f=function(x){a.push(x)},circular=[],o
 circular[0]=circular
 f(pp(['foo','bar',42]))
 o=[{str:'foo',x:'bar\n"baz"\nquux'},{str:'baz',y:['xyzzy','quux','foo'],z:undefined,zz:null,f:f,foo:[true,false],circular:circular}]
 o[1].self=o[1]
 f(pp([o]))
 return a.join('\n\n')}

function pp(o,depth){return pp_r(o,'',depth==undefined?32:depth)}

function pp_r(o,ss,d){var a=[],p
 if(!d)return '…'
 if(o===undefined)return 'undefined'
 if(o===null)return 'null'
 switch(typeof o){
 case 'boolean':return o.toString()
 case 'string':return pp_quote(o)
 case 'number':return o.toString()
 case 'function':return o.toString().replace(/\s+/g,'').replace(/(.{32}).+/,'$1…')}
 if(o.constructor==Array){
  o.forEach(function(e,i){
   a.push(pp_r(o[i],' '+ss,d-1))})
  return '['+a.join('\n'+ss+',')+']'}
 if(o.constructor==Date)return o.toString()
 for(p in o) if(o.hasOwnProperty(p))
  a.push(p+':'+pp_r(o[p],(',:'+p).replace(/./g,' ')+ss,d-1))
 return '{'+a.join('\n'+ss+',')+'}'}

pp=pp_smart

// pp_smart outputs sharp variables (like Mozilla), (optionally) re-orders object properties so that the largest ones come at the end (which makes reading deeply nested objects much easier), and tries to produce much more compact output by compressing properties and array members onto the same line when possible up to some specified line length (by default 80 chars)

// x, n_rows, n_cols
function pp_smart(x,opts){var parents=[],refs=[]
 opts=opts||{}
 default_('rows',Infinity)
 default_('cols',72)
 default_('show_f',function(f){return (''+f).replace(/\s+/g,' ').replace(/(.{32}).{16,}/,'$1…')})
 default_('reorder',true)
 default_('string_escape',false)
 default_('string_limit',64)
 default_('hide',[])
 parents=[]
 return go(x,"")
 function default_(k,v){if(opts[k]===undefined)opts[k]=v}
 function lines(s){return s.split('\n').length}
 function go(x,ss){var i,l,a=[],sub,cols,p,defer=[]
  if(x===undefined)return 'undefined'
  if(x===null)return 'null'
  switch(typeof x){
   case 'string':return pp_quote(x,opts).replace(/\n/g,'\n '+ss)
   case 'boolean':
   case 'number':return ''+x
   case 'function':return opts.show_f(x)}
  if(x.constructor==Date)return x.toString()
  cols=opts.cols-ss.length
  if((i=parents.lastIndexOf(x))>-1)refs.push(parents[i])
  if((i=refs.lastIndexOf(x))>-1)return '#'+i+'#'
  if(x.constructor==Array||Array.isArray&&Array.isArray(x)){
   parents.push(x)
   for(i=0,l=x.length;i<l;i++){
    sub=(go(x[i],' '+ss))
    if(a.length) sub=','+sub
    if(sub.indexOf('\n')>-1){
     if(a.length) a.push('\n'+ss)
     a.push(sub)}
    else{
     if(cols-sub.length < 0){a.push('\n'+ss);cols=opts.cols-ss.length}
     a.push(sub)
     cols-=sub.length}}
   parents.pop()
   return ((i=refs.lastIndexOf(x))>-1?'#'+i+'=':'')
        + '['+a.join('')+']'}
  parents.push(x)
  for(p in x) if(Object.prototype.hasOwnProperty.call(x,p)){
   if(opts.hide.indexOf(p)>-1)sub=p+':<hidden>'
   else sub=p+':'+go(x[p],(',:'+p).replace(/./g,' ')+ss)
   if(sub.indexOf('\n')>-1){
    if(opts.reorder)defer.push(sub)
    else{
     if(a.length)sub=','+sub
     if(a.length) a.push('\n'+ss)
     a.push(sub)}}
   else{
    if(a.length)sub=','+sub
    if(cols-sub.length<0 && a.length){a.push('\n'+ss);cols=opts.cols-ss.length}
    a.push(sub)
    cols-=sub.length}}
  defer.sort(function(a,b){var la=lines(a),lb=lines(b); return la==lb?0:la>lb?1:-1})
  for(i=0,l=defer.length;i<l;i++){
   if(a.length) a.push('\n'+ss+',')
   a.push(defer[i])}
  parents.pop()
  return ((i=refs.lastIndexOf(x))>-1?'#'+i+'=':'')
       + '{'+a.join('')+'}'}}

function pp_quote(s,opts){opts=opts||{}
 if(opts.string_escape) s=s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n')
 if(opts.string_limit && s.length>opts.string_limit)s=s.slice(0,opts.string_limit)+'…'
 if(s.indexOf("'")==-1)return "'"+s+"'"
 return '"'+s.replace(/"/g,'\\"')+'"'}

/*

// version for IRC bot
// returns output on a single line, and adds E4X support

function pp(o,depth){return pp_r(o,depth==undefined?8:depth)}

function pp_r(o,d){var a=[],p
 if(!d)return '...'
 if(o===undefined)return 'undefined'
 if(o===null)return 'null'
 switch(typeof o){
 case 'boolean':return o.toString()
 case 'string':return '"'+o.replace(/\n/g,'\\n').replace(/"/g,'\\"')+'"'
 case 'number':return o.toString()
 case 'xml':return o.toXMLString()}
 if(o instanceof RegExp)return '/'+o.source+'/'
 if(typeof o=='function')return o.toString().replace(/\s+/g,' ').replace(/(.{32}).+/,'$1…')
 if(o.constructor==Array){
  o.forEach(function(e,i){
   a.push(pp_r(o[i],d-1))})
  return '['+a.join(',')+']'}
 if(o.constructor==Date){
  return o.toString()}
 for(p in o) if(Object.prototype.hasOwnProperty.call(o,p))
  a.push(p+':'+pp_r(o[p],d-1))
 return '{'+a.join(',')+'}'}

/*
*/

function quote_string_single(s){
 return "'"
      + s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/'/g,"\\'")
      + "'"}

function quote_string_double(s){
 return '"'
      + s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/"/g,'\\"')
      + '"'}

(function(){
 function create(){
  function log(o){var x,s=''
   if(arguments.length>1){o=[].concat(Array.prototype.slice.call(arguments))}
   if(log.timing){x=+new Date;s=x-(log.time||x)+'ms\n';log.time=x}
   log.log.push(s+(typeof o=='string'?o:pp(o)));return o}
  log.log=[]
  log.get=function(n){return '\n\n'+log.log.slice(n?-n:0).join('\n\n')}
  log.count=function(){return log.log.length}
  log.clear=function(){log.log=[]}
  log.limit=function(n){if(log.log.length>n)log.log=log.log.slice(-n)}
  return log}
 log=create()
 log.create=create})()

function deepEq(x,y){var p
 if(x===y)return true
 if(typeof x!='object'
 || typeof y!='object')return false
 for(p in x)if(!deepEq(x[p],y[p]))return false
 for(p in y)if(!(p in x))return false
 return true}

function extend(a,b){
 for(var p in b)if(Object.prototype.hasOwnProperty.call(b,p))a[p]=b[p]
 return arguments.length==2?a:extend.apply(null,[a].concat(Array.prototype.slice.call(arguments,2)))}



/* assert.js */

function assert(x,msg){if(!x)throw new Error('assertion failed'+(msg?': '+msg:''))}


/* codegen_6_attr.js */

function v6_named_res(result){var dict,ret,hide,warnings,st
 hide=
  ['anonymous']
 //st=showTree(result,{hide:hide})
 dict={
RuleSet:
  function(_,cn){ret=cn},

Rule:
  function(_,cn){return [cn[0][1],cn[1]]},

NonTerminal:
  function(m){return re_reference(m.text())},

OrdChoice:
  function(_,cn){return re_union(cn)},

AtomicExpr:transparent,
SeqUnit:transparent,
Replicand:transparent,
ParenthExpr:transparent,

AnyRep:
  function(_,cn){return re_rep(0,0,cn[0])},
M: function(m){return parseInt(m.text(),10)},
N: function(m){return parseInt(m.text(),10)},
MNRep:
  function(_,cn){
   if(cn.length==2)return re_rep(cn[1],cn[1],cn[0])
   else return re_rep(cn[1],cn[2],cn[0])},
Optional:
  function(_,cn){return re_rep(0,1,cn[0])},
PosRep:
  function(_,cn){return re_rep(1,0,cn[0])},

Sequence:
  function(_,cn){return re_sequence(cn)},

StrLit:
  function(m){return re_from_str(m.text().slice(1,-1))},

Epsilon:
  function(){return re_from_str('')},

NegLookahead:
  function(_,cn){return re_neg_lookahead(cn[0])},

PosLookahead:
  function(_,cn){return re_pos_lookahead(cn[0])},

PropSpec:
  function(m){return CSET.fromUnicodeGeneralCategory(m.text())},

NegativeSpec:
  function(_,cn){return CSET.complement(cn[0])},
PositiveSpec:
  function(_,cn){return cn[0]},
UnicodePropSpec:
  function(_,cn){return cn[0]},
CodePointExpr:
  function(_,cn){return cn[0]},

CharSet:
  function(_,cn){return re_from_cset(cn[0])},
CharSetUnion:
  function(_,cn){return foldl1(CSET.union,cn)},
//CharSetIntersection:
//  function(_,cn){return foldl1(CSET.intersection,cn)},
CharSetDifference:
  function(_,cn){return foldl1(CSET.difference,cn)},
CharSetExpr:transparent,
PosCharSet:
  function(_,cn){return cn[0]||CSET.nil},
NegCharSet:
  function(_,cn){return CSET.complement(cn[0]||CSET.nil)},

UPlusCodePoint:
  function(m){return parseInt(m.text().slice(2),16)},

CodePointLit:
  function(m){return cpFC(m.text())},

CodePoint:
  function(_,cn){return CSET.fromInt(cn[0])},

CodePointRange:
  function(_,cn){return CSET.fromIntRange(cn[0][0],cn[1][0])},

CodePointFrom:transparent,
CodePointTo:transparent,

warn:function(s){warnings.push(s)}

}
 warnings=[]
 treeWalker(dict,result)
 if(warnings.length)throw warnings
 return ret
 function transparent(_,cn){return cn[0]}

 // from CSET
 function cpFC(s){var hi,lo
  if(/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(s)){
   hi=s.charCodeAt(0)
   lo=s.charCodeAt(1)
   return 0x10000+(((hi&0x3FF) << 10) | (lo&0x3FF))}
  return s.charCodeAt(0)}}



/* codegen_6.js */

function codegen_v6(opts,named_res,_x){var vars,rules,function_m_x,mainloop,ft,function_emit,dbg,function_fail,function_assert,nameline,asserts,single_call_special_case,id_names,commonjs_begin,commonjs_end,function_dbg,dfa_table,dbg_tree
 //opts.debug=true
 //opts.trace=true
 //opts.asserts=true
 opts=extend(_x||{},opts||{})
 // the 'opts' variable includes our options, but since we have to pass these into every part of the code generator, it makes a convenient place to store state, such as caches, various assigned numbers, etc.
 // rather than mutating the passed-in opts object, we copy its properties onto _x if it was provided or a new object
 // the undocumented third argument _x can be used to examine the state after the call
 function extend(a,b){for(var p in b)a[p]=b[p];return a}
 opts.elide=opts.elide||[]
 opts.drop=opts.drop||[]
 opts.leaf=opts.leaf||[]
 opts.prefix=opts.prefix||''
 opts.start=opts.start||named_res[0][0]
 opts.fname=opts.fname||opts.prefix+opts.start
 opts.target_language=opts.target_language||'ES3'
 opts.commonjs=!!opts.commonjs
 opts.S_map=[]
 opts.dfa_table=[]
 rules=v6_named_res_to_rules(opts,named_res)  // build our "rule" structures
 rules=v6_expr_fixups(opts,rules)             // simple syntactic transformations
 rules=v6_dependencies(opts,rules)            // dependency analysis (we don't generate code for unused rules)
 rules=v6_drop_contexts(opts,rules)           // find rules called only in dropped contexts
 rules=v6_add_shadow_start_rule(opts,rules)   // see doc/* for information on the shadow start rule
 nameline=v6_nameline(opts,rules)             // the nameline is an array of the rule names
 rules=v6_leaf_dfas(opts,rules)               // generate leaf DFAs
 rules=v6_tree_attribution(rules)             // next-gen TAL prototype
 if(opts.debug) dbg_tree=pp(rules,{hide:['expr','re']})
 if(opts.t_bufferout) // caller-provided flags
  v6_apply_flags(opts,rules)
 else{
  v6_calculate_flags(opts,rules)
  v6_calculate_streamability(opts,rules)}
 rules=v6_cset_equiv(opts,rules)              // calculate and store the cset equivalence classes
 rules=v6_assign_ids(opts,rules)              // assign state IDs to the rule sub-expressions
 rules=v6_TMF(opts,rules)                     // assign T, M, and F states
 dbg=opts.trace?v6_dbg(opts,rules):function(){return ''}
 asserts=opts.asserts
 function asrt(expr,msg,trm){return asserts?'assert('+expr+','+pp_quote(msg)+')'+(trm||''):''}
 id_names=opts.commonjs?'exports.names':opts.fname+'.names'
 vars=['eof=false'
      ,'s=\'\'','l=0'
      ,'S='+rules._.expr.S_flags
      ,'T','M','F','D','R'
      ,'tbl=[]','x'
      ,'pos=0','offset=0'
      ,'buf=[]','bufs=[]','states=[]','posns=[]','c'
      ,'equiv'
      ,'ds','dp' // DFA state and position saved between chunks
      ,'failed=0'
      ,'emp=0','emps=[]' // emit position and stack
      ]
 if(opts.trace) vars.push('S_map=[\''+opts.S_map.join('\',\'')+'\']')
 ft=v6_flag_test(opts) // ft ("flag test") takes varname, flagname → flag test expression

 dfa_table=v6_dfa_table(opts,rules)('D','s','pos','equiv','ds','dp')+'\n'

 commonjs_begin=';(function(exports){'
  + 'exports.names='+nameline
  + ';exports.parse='+opts.fname
  + '\n'

 commonjs_end='})(typeof exports==\'object\'?exports:'+opts.fname+'={});'

 function_emit='function emit(){var x='
  + 'bufs.length?bufs[0]:buf;'
  + 'if(x.length){out(\'tree segment\',x);'
  +  'if(bufs.length)bufs[0]=[];else buf=[]}}'

 function_fail='function fail(s){'
  + 'out(\'fail\',pos,s);'
  + 'failed=1'
  + '}'

 function_m_x='function(m,x){'
  + 'if(failed){out(\'fail\',pos,\'parse already failed\');return}\n'
  + 'switch(m){\n'
    // probably some room for optimization in this while() loop (i.e. getting rid of it)
  + 'case \'chunk\':s+=x;l=s.length;while(tbl.length<l+1)tbl.push([]);mainloop();break\n'
  + 'case \'eof\':eof=true;mainloop();break\n'
  + 'default:throw new Error(\'unhandled message: \'+m)'
  + '}}\n'

 function_assert='function assert(x,msg){if(!x)throw new Error(\'assertion failed\'+(msg?\': \'+msg:\'\'))}'

 function_dbg="function dbg(msg){"
  + "out(msg,'S:'+(S_map[S>>>"+opts.flagbits+"]||'unknown state'+S>>>"+opts.flagbits+")"
  + "+' pos:'+pos"
  // + "+' '+s.charAt(pos)"
  + "+' R:'+R"
  + "+' stack:'+states.map(function(s){return s>>>"+opts.flagbits+"})"
  + "+' posns:'+posns"
  + "+' bufs:'+bufs.map(function(b){return '['+b+']'})"
  + "+' buf:'+buf"
  + "+' emps:['+emps+']'"
  + "+' emp:'+emp"
  + ")}"

 single_call_special_case='if(typeof out==\'string\'){s=out;out=[];'
  +  'x='+opts.fname+'(function(m,x,y){if(m==\'fail\')out=[false,x,y,s];'
  +    'if(m==\'tree segment\')out=out.concat(x)});'
  +  'x(\'chunk\',s);'
  +  'x(\'eof\');'
  +  'return out[0]===false?out:[true,{names:'+id_names
  +                                  ',tree:out'
  +                                  ',input:s}]}'

 mainloop='//mainloop\nfunction mainloop(){for(;;){'
  + dbg('main')+'\n'
  + 'if(dp==undefined&&('+v6_is_not_prim_test(opts)('S')+'))\nt_block:{\n'
  + (asserts?'assert(typeof S=="number","S")\n'
     + 'assert((S>>>'+opts.flagbits
     +   ')<='+opts.highest_used_S+',"S in range: "+S)\n'
     + "assert(R==undefined,'result is unknown (R:'+R+',S:'+(S>>>"+opts.flagbits+")+')')\n"
     :'')
  + 'if('+ft('S','pushpos')+')posns.push(pos)\n'
  + 'if('+ft('S','t_bufferout')+'){bufs.push(buf);buf=[]}\n'
  + 'if('+ft('S','t_emitstate')+'){'
  +     asrt('emp<=pos','emit position <= pos',';')
  //+     'if(emp<pos)buf.push(-1,pos-emp);'
  +     'emps.push(emp);' // store emit position
  +     'emp=pos;' // will be clobbered by cache hit
  +     'buf.push(S>>>'+opts.flagbits+')}\n' // buf is clobbered by cache hit
  + 'if('+ft('S','cache')+'&&(x=tbl[pos-offset][S])!=undefined){'
  +     'if(x){R=true;pos=x[0];buf=x[1];if(emp<x[2])emp=x[2]}else{R=false}'
  +     dbg('cached')+'}\n'
  + '}\n' // end if not prim test (i.e. t_block)
  + 'if(R==undefined){' // if no cached result
  +  dbg('test')
  +  '\n'// call DFA\n'
  +  'if(D[S>>>'+opts.flagbits+']){'
  +   'R=D[S>>>'+opts.flagbits+'](ds||0,dp||pos);'
  +   'if(R==undefined){' // need more data from caller
  +    'if(eof){ds=dp=undefined;R=false}'
  +    'else{out(\'ready\');return}'
  +   '}' // end if need more data
  +  '}\n' // end if dfa exists
  +  'else{'
  +   'states.push(S);'
  +   asrt('T[S>>>'+opts.flagbits+']','T',';')
  +   'S=T[S>>>'+opts.flagbits+']'
  +  '}\n' // end else
  +  'if(S=='+opts.S_ε+'){R=true;S=states.pop()}'
  + '}' // end if R==undefined

  // has_result loop

  + '\nwhile(R!=undefined){'
  + dbg('result')+'\n'
  + 'if(S=='+rules._.expr.S_flags+'){(R?emit:fail)();return}'
  + 'if(R){\n'
  +  'if('+ft('S','cache')+'){tbl[posns[posns.length-1]][S]=[pos,buf,emp];buf=buf.slice()}\n'
  +  'if('+ft('S','t_emitstate')+'){'
  +    'if(pos!=emp&&emp!=posns[posns.length-1]){'
  +      'buf.push(-1,pos-emp)}'
  +    'emp=emps.pop();'
  +    'if(emp!=posns[posns.length-1]){buf=[-1,posns[posns.length-1]-emp].concat(buf)}'
  +    '}\n'
  +  'if('+ft('S','m_emitstate')+')buf.push(S>>>'+opts.flagbits+')\n'
  +  'if('+ft('S','m_emitclose')+')buf.push(-2)\n'
  +  'if('+ft('S','m_emitlength')+')buf.push(pos-posns[posns.length-1])\n'
  +  'if('+ft('S','t_emitstate')+'){'
  +    'emp=pos'
  +    '}\n'
  +  'if('+ft('S','m_resetpos')+')pos=posns[posns.length-1]\n'
  +  'if('+ft('S','pushpos')+')posns.pop()\n'
  +  'if('+ft('S','m_tossbuf')+')buf=bufs.pop()\n'
  +  'if('+ft('S','m_emitbuf')+'){buf=bufs.pop().concat(buf);'
  +    '}\n'
  +  'if(!bufs.length&&buf.length>64)emit()\n'
  +  (asserts?'assert(M[S>>>'+opts.flagbits+'],\'M\')\n':'')
  +  'S=M[S>>>'+opts.flagbits+']'
  + '}\n' // end if(R)
  + 'else{\n' // rule failed
  +  'if('+ft('S','cache')+')tbl[posns[posns.length-1]][S]=false\n'
  +  'if('+ft('S','pushpos')+')pos=posns.pop()\n'
  +  'if('+ft('S','f_tossbuf')+')buf=bufs.pop()\n'
  +  'if('+ft('S','t_emitstate')+'){emp=emps.pop()}\n'
  +  'if(emp>pos){emp=pos}\n'
  +  asrt('F[S>>>'+opts.flagbits+']','F','\n')
  +  'S=F[S>>>'+opts.flagbits+']'
  + '}\n'
  + 'if(S=='+opts.S_succeed+'){R=true;S=states.pop()}'
  + 'else if(S=='+opts.S_fail+'){R=false;S=states.pop()}'
  + 'else R=undefined'
  + ';'+dbg('res_end')
  + '}' // end has_result loop
  + '}}'
 return (opts.debug?
              ( '/*\n\n'
              + v6_sexp(rules)+'\n\n'
              //+ dir(opts)+'\n\n'
              //+ pp(opts.S_map)+'\n\n'
              //+ pp(opts.prim_test_assignments)+'\n\n'
              + dbg_tree+'\n\n\n\n'
              + pp(rules,{string_limit:0})+'\n'
              + 'opts.equiv_classes\n' + pp(opts.equiv_classes)+'\n\n'
              //+ 'opts.all_csets\n' + pp(opts.all_csets)+'\n\n'
              + 'opts.cset_cache\n' + pp(opts.cset_cache)+'\n\n'
              + '*/\n\n' ):'')
      + (opts.commonjs?commonjs_begin:'')
      + (opts.trace?v6_legend(opts,rules)+'\n':'')
 
      + opts.fname+'.names='+(opts.commonjs?id_names:nameline)+'\n'
      + 'function '+opts.fname+'(out){'
          +varstmt(vars)+'\n'
          +v6_cset_equiv_array(opts,rules,'equiv')
          +v6_TMF_tables(opts,rules)
          +dfa_table
          +single_call_special_case+'\n'
          +'return '+function_m_x
          +mainloop+'\n'
          +function_emit+'\n'
          +function_fail
          +(asserts?'\n'+function_assert:'')
          +(opts.trace?'\n'+function_dbg:'')
          +'}\n'
      + (opts.commonjs?commonjs_end:'')
 }

function v6_dbg(opts,rules){return function(msg){
  return 'dbg("'+msg+'")'}}

function v6_legend(opts,rules){
 return opts.fname+'.legend="'+v6_sexp(rules).replace(/\n/g,'\\n')+'";'}

function v6_sexp(res){var name,ret=[]
 for(name in res){
  ret.push(name+' ← '+f(res[name].expr))}
 return ret.join('\n')
 function f(expr){var ret=[]
  ret=[expr.id
      ,re_shortnames[expr.type]
      ]
  if(expr.type==0) ret.push(CSET.show(expr.cset).replace(/\n/g,' ').replace(/(.{16}).+/,"$1…"))
  if(expr.type==1) ret.push(expr.strLit)
  if(expr.type==4) ret[1]='rep' // we only have *-rep by this point
  if(expr.type==5) ret.push(expr.ref)
  ret=ret.concat(expr.subexprs.map(f))
  return "("+ret.join(' ')+")"}}

re_shortnames=
['cset'    // 0
,'strLit'  // 1
,'seq'     // 2
,'ordC'    // 3
,'mn_rep'  // 4
,'ref'     // 5
,'neg'     // 6
,'pos'     // 7
,'ϵ'       // 8
]

function v6_dependencies(opts,rules){var ret={},deps
 go('_')(opts.start)
 return ret
 function go(caller){return function _go(rule_name){var rule
   rule=rules[rule_name]
   if(!rule) throw new Error('Rule required but not defined: '+rule_name)
   rule.callers=rule.callers||[]
   if(rule.callers.indexOf(caller)==-1)rule.callers.push(caller)
   rule.drop=opts.drop.indexOf(rule_name)>-1
   rule.elide=opts.elide.indexOf(rule_name)>-1
   if(ret[rule_name])return // it has already been processed
   ret[rule_name]=rule
   rule.direct_deps=v6_direct_dependencies(rule.expr)
   rule.direct_deps.map(go(rule_name))}}}

// Re → [String]
function v6_direct_dependencies(expr){var ret=[]
 v6_walk(function(expr){if(isNamedRef(expr.type))ret.push(expr.ref)})
  (expr)
 return uniq(ret.sort())}

function v6_drop_contexts(opts,rules){var rule_name,rule
 for(rule_name in rules){
  if(rule_name=='_')continue
  rule=rules[rule_name]
  //if('non_drop_ctx' in rule)continue
  if(rule.non_drop_ctx)continue
  v6_non_drop_ctx(rule,opts,rules)}
 return rules}

// non_drop_ctx is set iff a rule is called by a chain of non-dropped parent rules
function v6_non_drop_ctx(rule,opts,rules){var i,l,caller_name
 if(rule.non_drop_ctx=='pending')return // unknown, but cyclic
 if(rule.drop){
  rule.non_drop_ctx=false
  return false}
 rule.non_drop_ctx='pending'
 for(i=0,l=rule.callers.length;i<l;i++){caller_name=rule.callers[i]
  if(caller_name=='_' || v6_non_drop_ctx(rules[caller_name],opts,rules)){
   rule.non_drop_ctx=true
   return true}}
 rule.non_drop_ctx=false
 return false}

function v6_nameline(opts,rules){var names=[],p
 for(p in rules)names[rules[p].S]=rules[p].name
 return '[\''+names.join('\',\'')+'\']'}

function v6_named_res_to_rules(opts,res){var i,l,ret={},name
 for(i=0,l=res.length;i<l;i++){
  name=res[i][0]
  ret[name]={S:i+1
            ,re:res[i][1]
            ,name:name}}
 opts.highest_used_S=i
 return ret}

function v6_add_shadow_start_rule(opts,rules){var shadow_re
 // ShadowStartRule ← StartRule ![^]
 shadow_re=[2,[[5,opts.start],[6,[0,[0]]]]]

 rules._={S:++opts.highest_used_S
         ,name:"_"
         ,re:shadow_re}
 rules._.expr=v6_subexpr_fixups(opts,rules._)
 delete rules._.re
 return rules}

function v6_expr_fixups(opts,rules){var p
 for(p in rules){
  rules[p].expr=v6_subexpr_fixups(opts,rules[p])
  //delete rules[p].re
  }
 return rules}

function v6_subexpr_fixups(opts,rule){var n=0
 if(rule.re[0]!=2) rule.re=[2,[rule.re]]
 return go(rule)(rule.re)
 function go(parent){return function(re){var ret
   if(re[0]==4) re=v6_munge_mnrep(re)
   if(re[0]==1) re=v6_strLit2seq(re)
   ret={id:rule.name+'+'+n++
       ,type:re[0]
       ,S:undefined
       ,T:undefined
       ,M:undefined
       ,F:undefined
       ,flags:undefined}
   if(n==1)ret.toplevel=true
   if(ret.type==0) ret.cset=re[1]
   if(ret.type==1) ret.strLit=re[1]
   if(ret.type==5) ret.ref=re[1]
   ret.flag_n=0
   ret.subexprs=re_subexprs(re).map(go(ret))
   return ret}}}

// replace any m,n-reps with 0,0-reps, sequences, and optionals
function v6_munge_mnrep(re){var m,n,required,optional,i
 m=re[1]
 n=re[2]
 if(m==0&&n==0) return re
 required=[]
 i=m; while(i--) required.push(re[3].slice())
 if(n==0) optional=[4,0,0,re[3]]
 else optional=opt_n(n-m,re[3])
 required.push(optional)
 if(required.length==1)return required[0]
 re=[2,required]
 return re}

function v6_strLit2seq(re){var s=re[1],cset_res=[],i
 if(s.length==0)return [8]
 for(i=0;i<s.length;i++){
  cset_res[i]=[0,CSET.fromInt(s.charCodeAt(i))]}
 if(cset_res.length==1)return cset_res[0]
 return [2,cset_res]}

// n, re → (re (re (re … (re / ϵ) … / ϵ) / ϵ) / ϵ)
function opt_n(n,re){
 if(n==0) return [8]
 assert(n>0)
 if(n==1) return [3,[re,[8]]]
 return [3,[[2,[re,opt_n(n-1,re)]],[8]]]}

function v6_apply_flags(opts,rules){var p,ret={}
 for(p in rules){
  f(rules[p].expr)}
 function f(expr){
  expr.flags=v6_expr_apply_flags(opts,expr)
  expr.subexprs.forEach(f)}}

function v6_expr_apply_flags(opts,expr){var ret={}
 f('cache')
 f('t_bufferout')
 f('pushpos')
 f('t_emitstate')
 f('m_emitstate')
 f('m_emitclose')
 f('m_emitanon')
 ret.m_emitlength=ret.t_emitstate||ret.m_emitstate||ret.m_emitanon
 f('m_resetpos')
 f('m_emitbuf')
 f('m_tossbuf')
 f('f_tossbuf')
 return ret
 function f(s){
  ret[s]=opts[s].indexOf(expr.id)>-1}}

function v6_collect_csets(re){
 switch(re[0]){
 case 0:return [re[1]]
 case 1:return re[1].split('').map(CSET.fromString)
 case 2:
 case 3:return concat(re[1].map(v6_collect_csets))
 case 4:return v6_collect_csets(re[3])
 case 5:throw new Error('named ref not handled.')
 case 6:
 case 7:return v6_collect_csets(re[1])
 case 8:return []}}

function varstmt(vars){
 if(!vars.length) return ''
 return 'var '+vars.join(',')+';'}

function isCset(n){return n==0}
function isStrLit(n){return n==1}
function isSequence(n){return n==2}
function isOrdC(n){return n==3}
function isRep(n){return n==4}
function isNamedRef(n){return n==5}
function isPositiveLookahead(n){return n==7}
function isLookahead(n){return n==6||n==7}
function isEmpty(n){return n==8}

/*
0 → cset
1 → string literal
2 → sequence of res
3 → ordC of res
4 → m to n reps of re
5 → named reference
6 → re negative lookahead
7 → re positive lookahead
8 → ϵ (equivalent to [1,""])
*/

// re_subexprs :: Re → [Re]
function re_subexprs(re){switch(re[0]){
 case 0:return []
 case 1:return []
 case 2:return re[1]
 case 3:return re[1]
 case 4:return [re[3]]
 case 5:return []
 case 6:return [re[1]]
 case 7:return [re[1]]
 case 8:return []}
 throw new Error(pp(re))}

function v6_assign_ids(opts,rules){var name,rule,last_id,bitfield_order,a
 last_id=rules._.S
 for(name in rules){rule=rules[name]
  go(rule.expr)}
 // we can re-use all the flag bits for primitive tests and other special states that don't have flags
 opts.S_succeed=++last_id
 opts.S_fail=++last_id
 opts.S_ε=++last_id
 opts.lowest_prim_test=opts.S_ε
 opts.highest_used_S=last_id
 return rules
 function go(expr){
  if(!bitfield_order){
   bitfield_order=v6_bitfield_order(expr.flags)
   opts.flagbits=bitfield_order[0]
   opts.bitfield_map=bitfield_order[1]}
  //expr.foo=bitfield_order
  if(expr.S==undefined){
   if(expr.toplevel) expr.S=rule.S
   else expr.S=++last_id
   opts.S_map[expr.S]=expr.id}
  expr.flag_n=v6_obj_to_bitfield(expr.flags,opts.bitfield_map)
  expr.S_flags=expr.S<<opts.flagbits^expr.flag_n
  //expr.S_flags_=expr.S_flags.toString(2)
  expr.subexprs.forEach(go)}}

function v6_bitfield_order(o){var p,i=0,ret={}
 for(p in o) ret[p]=1<<i++
 return [i,ret]}

function v6_obj_to_bitfield(flags,bitfield_order){var p,n=0
 for(p in flags){
  if(flags[p]) n^=bitfield_order[p]}
 return n}

function v6_flag_test(opts){return function(varname,flagname){
  return varname+'&'+opts.bitfield_map[flagname]+'/*'+flagname+'*/'}}

function v6_TMF(opts,rules){var name,rule
 for(name in rules){rule=rules[name]
  go()(rule.expr)}
 return rules
 function go(parent){return function(expr,i,a){var next
   switch(expr.type){
    case 0:expr.T=v6_assign_prim_test_id(opts,expr.cset);break
    case 5:expr.T=rules[expr.ref].expr.S_flags;break
    case 4:
    case 6:
    case 7:assert(expr.subexprs.length==1,'subexpr length')
           // fallthrough //
    case 2:
    case 3:expr.T=expr.subexprs[0].S_flags;break
    case 8:expr.T=opts.S_ε;break
    default:throw new Error('bad expr.type '+expr.type)}
   if(expr.toplevel){
    expr.M=opts.S_succeed
    expr.F=opts.S_fail}
   else{
    next=a[i+1] // next sibling expr if any
    switch(parent.type){
     case 2:expr.M=next?next.S_flags:opts.S_succeed
            expr.F=opts.S_fail;break
     case 3:expr.M=opts.S_succeed
            expr.F=next?next.S_flags:opts.S_fail;break
     case 4:assert(!next,'*-expr is singleton')
            expr.M=expr.S_flags
            expr.F=opts.S_succeed;break
     case 6:assert(!next,'lookahead is singleton')
            expr.M=opts.S_fail
            expr.F=opts.S_succeed;break
     case 7:assert(!next,'lookahead is singleton')
            expr.M=opts.S_succeed
            expr.F=opts.S_fail;break
     default:throw new Error('unexpected parent type '+parent.type)}}
   if(expr.dfa){
    opts.dfa_table[expr.S]=expr.dfa
    expr.T=undefined
    return} // no TMF entries for subexpressions when using a DFA
   expr.subexprs.forEach(go(expr))}}}

function v6_assign_prim_test_id(opts,cset){var string_representation,x
 opts.prim_test_assignments=opts.prim_test_assignments||{}
 opts.prim_test_reverse=opts.prim_test_reverse||{}
 string_representation=cset.toString()
 x=opts.prim_test_assignments[string_representation]
 if(x)return x
 x=++opts.highest_used_S
 if(!opts.lowest_prim_test)opts.lowest_prim_test=x
 opts.highest_prim_test=x
 opts.prim_test_assignments[string_representation]=x
 opts.prim_test_reverse[x]=cset
 return x}

function v6_is_prim_test(opts){return function(varname){
  return varname+'<'+(opts.highest_prim_test+1)
    +'&&'+varname+'>'+(opts.lowest_prim_test-1)}}

function v6_is_not_prim_test(opts){return function(id_S){
  return id_S+'>'+(opts.highest_prim_test)
   +'||'+id_S+'<'+(opts.lowest_prim_test)}}

function v6_prim_test_case_statements_BMP(opts){return function(id_c,id_R){var ret=[],p,cset,BMP_no_surrogates,surrogates
  surrogates=CSET.fromIntRange(0xD800,0xDFFF)
  BMP_no_surrogates=CSET.difference(CSET.fromIntRange(0,0xFFFF),surrogates)
  for(p in opts.prim_test_reverse){
   cset=CSET.intersection(opts.prim_test_reverse[p],BMP_no_surrogates)
   ret.push(v6_cset_to_case_stmt(opts)(id_c,id_R,p,cset))}
  return ret.join('\n')}}

function v6_prim_test_case_statements_supplementary(opts){return function(id_c,id_R){var ret=[],p,cset,supplementary
  supplementary=CSET.fromIntRange(0x10000,0x10FFFF)
  for(p in opts.prim_test_reverse){
   cset=CSET.intersection(opts.prim_test_reverse[p],supplementary)
   if(CSET.empty(cset))continue
   else ret.push(v6_cset_to_case_stmt(opts)(id_c,id_R,p,cset))}
  return ret.join('\n')}}

function v6_cset_to_case_stmt(opts){return function(id_c,id_R,_case,cset){
  return 'case '+_case+':'+id_R+'='+cset_to_expr(cset,id_c)+';break'}}

function v6_ε_ifstmt(opts){return function(id_S,id_R){
  return 'if('+id_S+'=='+opts.S_ε+')'+id_R+'=true'}}

function v6_TMF_tables(opts,rules){var T=[],M=[],F=[],name
 for(name in rules){
  v6_walk(f)(rules[name].expr)}
 return 'T='+v6_rle_if_shorter(T)+'\n'
      + 'M='+v6_rle_if_shorter(M)+'\n'
      + 'F='+v6_rle_if_shorter(F)+'\n'
 function f(expr){
  assert(expr.S_flags>>>opts.flagbits === expr.S,'S vs S_flags')
  T[expr.S]=expr.T
  M[expr.S]=expr.M
  F[expr.S]=expr.F}}

function v6_walk(f){return function walk(expr){
  f(expr)
  expr.subexprs.map(walk)}}



/* codegen_6_tree_attribution.js */

// prototype of a different approach to TAL.
// used to collect the csets for character equivalence classes
// the v6_tree_rules is what the syntax might look like, the rest of the file is the support code.

function v6_tree_attribution(parse_rules){
 v6_tree_select(v6_tree_rules())(parse_rules)
 //v6_tree_force_all(parse_rules)
 v6_tree_force(parse_rules)
 v6_tree_cleanup(parse_rules)
 return parse_rules}

function v6_tree_cleanup(o){var p
 if(typeof o != 'object')return
 if(!('_attrs' in o))return
 if(o._attrs.deleting)return
 o._attrs.deleting=true
 for(p in o)if(hasprop(o,p)&&p!='_attrs')v6_tree_cleanup(o[p])
 delete o._attrs}

function hasprop(o,p){return Object.prototype.hasOwnProperty.call(o,p)}

function v6_tree_force(rules){var p,stack
 for(p in rules) if(hasprop(rules,p) && p!='_attrs'){
  rules[p].all_csets=v6_tree_force_attr('all_csets',stack=[])(rules[p])}}

function v6_tree_force_all(o){var p,stack
 if(!(typeof o=='object'))return
 if(!o._attrs)return
 for(p in o._attrs.functions){
  v6_tree_force_attr(p,stack=[])(o)}
 for(p in o) if(hasprop(o,p) && p!='_attrs'){
  v6_tree_force_all(o[p])}}

function v6_tree_select(rules){var token
 return function(tree){token={}; loop(tree)}
 function loop(tree){var environment,i,l,rule,test,p
  environment={}
  if(tree._attrs && tree._attrs.token==token)return
  setup(tree)
  for(i=0,l=rules.length;i<l;i++){rule=rules[i]
   environment.anchor=tree
   environment.current=tree
   environment.bindings={}
   if(rule[0](environment)) rule[1](environment)}
  if(tree instanceof Array){
   for(i=0,l=tree.length;i<l;i++){
    if(typeof tree[i]=='object'){
     loop(tree[i])}}}
  else{
   for(p in tree) if(Object.prototype.hasOwnProperty.call(tree,p)){
    if(typeof tree[p]=='object'){
     if(p=='_attrs')continue
     loop(tree[p])}}}}
 function setup(node){
  node._attrs=
   {token:token
   ,functions:{}
   ,forced:{}
   ,pending:{}
   ,errors:{}
   ,values:{}}}}

function v6_tree_rules(){var stack=[]
 return build(
 [

  //{subexprs:cn←[{}]}
  [obj(key('subexprs',collect('cn',list(obj())))),
     'all_csets',function(m){return concat(m.cn.map(attr('all_csets')))}]
 

  //{expr:x←{}}
 ,[obj(key('expr',collect('x',obj()))),
     'all_csets',function(m){return attr('all_csets')(m.x)}]


  //{dfa:trans←{type:'transition'}}
 ,[obj(key('dfa',collect('trans',obj(key('type',eq('transition')))))),
     'all_csets',function(m){return v6_csets_from_dfa(m.trans)}]

 ])

function v6_csets_from_dfa(d){var all,i,l,t
 if(d.type!='transition')return []
 all=[]
 t=d.transition
 for(i=0,l=t.length;i<l;i++){
  all.push(t[i][0])
  all=all.concat(v6_csets_from_dfa(t[i][1]))}
 return all}

function among(as){return function _among(x){
  return as.indexOf(x.current)>-1}}

function and(a,rest){rest=Array.prototype.slice.call(arguments,1)
 if(!a)return function(){return true}
 rest=and.apply(null,rest)
 return function _and(x){var current
  current=x.current
  if(!a(x))return false
  x.current=current
  return rest(x)}}

function key(k,p){return function _key(x){var test
 if(!(k in x.current))return false
 x.current = x.current[k]
 test = !p || p(x)
 return test}}

function eq(a){return function _eq(x){return x.current==a}}

function list(p){return function _list(x){var i,l,xs
 xs=x.current
 if(!(x.current instanceof Array))return false
 if(p) for(i=0,l=xs.length;i<l;i++){
  x.current=xs[i]
  if(!p(x)){x.current=xs;return false}}
 x.current=xs
 return true}}

function collect(n,p){return function _collect(x){var it
  it=x.current
  return (!p || p(x)) && (x.bindings[n]=it, true)}}

function obj(p){return function _obj(x){
  return typeof x=='object' && (!p || p(x))}}

function build(rules){var i,l,rule,ret=[]
 for(i=0,l=rules.length;i<l;i++){rule=rules[i]
  ret.push([rule[0] // selector
           ,attr_define(rule[1],rule[2])])} // setter
 return ret}

function attr_define(n,f){return function _attr_define(x){
  x.anchor._attrs.functions[n]=
   (function(bindings){return function(){return f(bindings)}})
   (x.bindings)}}

function attr(n){var force
 force=v6_tree_force_attr(n,stack)
 return function _attr(x){return force(x)}}

} // end v6_tree_rules

function v6_tree_force_attr(n,stack){return function _v6_tree_force_attr(x){
  if(!x._attrs){
   x._attrs={errors:{},forced:{}}
   return err('attribute '+n+' requested but not defined')}
  if(!x._attrs.forced[n]){
   if(x._attrs.pending[n]) return err('circular reference')
   stack.push(n)
   if(!x._attrs.functions[n]){
    return err('attribute '+n+' requested but not defined')}
   try{x._attrs.values[n]=x._attrs.functions[n]()}
   catch(e){return err(e)}
   x._attrs.pending[n]=false
   x._attrs.forced[n]=true
   stack.pop()}
  return x._attrs.values[n]
  function err(s){
   return x._attrs.errors[n]=s+' '+stack.join(', ')}}}


/* codegen_6_dfa_generation.js */

// v6_leaf_dfas generates DFA objects for "leaf" expressions, i.e. simple expressions that we can determine to be regular.
// It attaches DFA objects to the expr objects, they are then used later to output code that will parse according to that DFA.

function v6_leaf_dfas(opts,rules){var p
 for(p in rules){
  go(rules[p].expr)}
 return rules
 function go(expr){var dfa
  if(dfa=v6_leaf_dfa(opts,expr))expr.dfa=dfa
  expr.subexprs.map(go)}}

// Currently we only generate DFAs for string literals (2) and character classes (0).
function v6_leaf_dfa(opts,expr){
 switch(expr.type){
 case 0:
  return v6_dfa_cset(expr.cset)
 case 2:
  return v6_dfa_seq(expr.subexprs,{})}}

function v6_dfa(opts,rules,rule){var next_dep,re
 re=rule.re
 while(next_dep=re_dependency(re))
  re=v6_substitute(next_dep,rules[next_dep].re)(re)
 return v6_dfa_2(re,{})}

function v6_dfa_2(expr,state){
 switch(expr.type){
 case 0:
  return v6_dfa_cset(expr.cset,state)
 case 1:
  return //v6_dfa_2(v6_strLit2seq(expr.subexprs),state)
 case 2:
  return v6_dfa_seq(expr.subexprs,state)
 case 3:
  return v6_dfa_ordC(expr.subexprs,state)
 case 4:
  return v6_dfa_rep(only_sub(expr),state)
 case 5:
  return //throw new Error('no named references here')
 case 6:
  return v6_dfa_neg(only_sub(expr),state)
 case 7:
  return v6_dfa_pos(only_sub(expr),state)
 case 8:
  return //v6_dfa_2([2,[]],state)
 default:
  throw new Error('v6_dfa: unexpected re type '+expr.type)}
 function only_sub(expr){
  assert(expr.subexprs.length==1,'exactly one subexpression')
  return expr.subexprs[0]}}

function v6_dfa_cset(cset,state){var sr,surrogates,bmp,i,l,srps,hi_cset,lo_cset,trans
 sr=CSET.toSurrogateRepresentation(cset)
 if(sr.surrogate_range_pairs.length == 0)
  return {type:'transition'
         ,transition:[[cset,{type:'match'}]]}
 surrogates=CSET.fromIntRange(0xD800,0xDFFF)
 // here we take the position that unmatched surrogates simply can never be accepted by a PanPG parser; this is the same as the v5 codegen and the v6 codegen without DFAs.  Other alternatives exist, however, and there are cases where searching for unmatched surrogates specifically is what is desired, so we might need to have some kind of optional behavior in the future.
 bmp=CSET.difference(sr.bmp,surrogates)
 srps=sr.surrogate_range_pairs
 trans=[[bmp,{type:'match'}]]
 for(i=0,l=srps;i<l;i++){
  hi_cset=srps[i][0];lo_cset=srps[i][1]
  trans.push([hi_cset,{type:'transition'
                      ,transition:[[lo_cset,{type:'match'}]]}])}
 return {type:'transition'
        ,transition:trans}}

function v6_dfa_seq(seq,state){var d1,d2
 if(!seq.length)return {type:'match'}
 d1=v6_dfa_2(seq[0],state)
 //assert(d1,'d1 from seq[0]: '+pp(seq[0]))
 d2=v6_dfa_seq(seq.slice(1),state)
 return go(d1,d2)
 function go(d1,d2){
  if(!d1 || !d2) return
  if(d1.type=='fail')return d1
  if(d2.type=='fail')return d2
  if(d1.type=='match')return d2
  if(d2.type=='match')return d1
  return v6_dfa_transition_map(d1,function(d){return go(d,d2)})}}

function v6_dfa_transition_map(d,f){var i,l,ret=[],existing
 assert(d.type=='transition','DFA type is transition')
 for(i=0,l=d.transition.length;i<l;i++){existing=d.transition[i]
  ret[i]=[existing[0],f(existing[1])]}
 return {type:'transition'
        ,transition:ret}}

function v6_dfa_ordC(exprs,state){var d1,d2,merged
 if(!exprs.length)return {type:'fail'}
 d1=v6_dfa_2(exprs[0],state)
 d2=v6_dfa_ordC(exprs.slice(1),state)
 return go(d1,d2)
 function go(d1,d2){
  if(!d1 || !d2)return
  if(d1.type=='fail')return d2
  if(d2.type=='fail')return d1
  if(d1.type=='match')return d1
  if(d2.type=='match')return v6_dfa_opt(d1,state)
  return v6_dfa_ordC_(v6_dfa_merge_transitions(d1,d2))}}

function v6_dfa_ordC_(x){var i,l,cset,t1,t2,ret,res,res2,cache,j
 ret=[]
 cache=[[],[]]
 for(i=0,l=x.length;i<l;i++){
  cset=x[i][0];t1=x[i][1];t2=x[i][2]
  if(t1.type=='fail')res=t2; else
  if(t2.type=='fail')res=t1; else
  if(t1.type=='match')res=t1; else
  if(t2.type=='match'){return} // decline
  else{ // both are transition states
   res=v6_dfa_ordC_(v6_dfa_merge_transitions(t1,t2))}
  if(!res)return
  assert(res,'v6_dfa_ordC_ has a value')
  if(res.type=='fail')continue
  res2=[cset,res]
  if((j=cache[0].indexOf(res))>-1){
   cache[1][j][0]=CSET.union(cache[1][j][0],cset)
   continue}
  cache[0].push(res);cache[1].push(res2)
  ret.push(res2)}
 return {type:'transition',transition:ret}}

function v6_dfa_merge_transitions(d1,d2){var i,l1,l2,j1s,j2s,t1,t2,fail,low1,low2,low1i,low2i,states1,states2,a,t1_next,t2_next,ret,prev,low,cset
 assert(d1.type=='transition'&&d2.type=='transition','called with transitions')
 fail={type:'fail'}
 t1=d1.transition;t2=d2.transition
 l1=t1.length;l2=t2.length
 states1=[];j1s=[];for(i=l1;i--;)states1[i]=j1s[i]=0
 states2=[];j2s=[];for(i=l2;i--;)states2[i]=j2s[i]=0
 prev=0
 ret=[]
 for(;;){
  a=lowest(t1,j1s);low1=a[0];low1i=a[1]
  a=lowest(t2,j2s);low2=a[0];low2i=a[1]
  t1_next=get_state(get_index(states1),t1)
  t2_next=get_state(get_index(states2),t2)
  if (low1 <= low2) {bump(states1,j1s,low1i);low=low1}
  if (low2 <= low1) {bump(states2,j2s,low2i);low=low2}
  if(low>0){
   // here we only produce single-range csets
   // a subsequent step could combine them
   cset= low==Infinity ? [prev] : [prev,low]
   ret.push([cset,t1_next,t2_next])}
  prev=low
  if(low1==Infinity && low2==Infinity)break}
 return ret
 // find the lowest unseen values in all csets in a transition
 // these represent flips between on and off, initially off
 // there may be more than one cset that flips on the same code point, so we use an array to store the i indices of the low values
 function lowest(transition,indices){var i,l,low_water_mark,val,j,ret_i
  low_water_mark=Infinity
  for(i=transition.length;i--;){
   j=indices[i]
   val=transition[i][0][j] // the jth value of the cset of the ith (cset,state) pair in the transition
   if(val<low_water_mark){
    low_water_mark=val
    ret_i=[i]}
   else if(val==low_water_mark){
    ret_i.push(i)}}
  return [low_water_mark,ret_i]}
 function bump(states,indices,is){var k,i
  if(!is)return
  for(k=0;k<is.length;k++){
   i=is[k]
   indices[i]++
   states[i]=!states[i]}}
 // get the active cset, assert at most one
 function get_index(states){var i,x
  for(i=states.length;i--;) if(states[i]){
   assert(x==undefined,'no overlapping csets in DLO')
   x=i}
  return x}
 function get_state(index,transition){
  if(index==undefined)return fail
  return transition[index][1]}}

// from an expression of the form α / ε, where d1 is a DFA-like corresponding to α
// here we currently only handle the case where α is determinate in one character, i.e. where d1 is a cset type, i.e. a transition which transitions only to fail or match states, not to any other transition state.
// other cases would require lookahead or backtracking, which we do not yet handle here
// actually, even this case involves lookahead, because the match needs to happen at the previous position, i.e. the position has already been advanced once by the time we read the next character.
// so we just decline here for now
function v6_dfa_opt(d1,state){}

function v6_dfa_rep(re,state){}

function v6_dfa_neg(re,state){}

function v6_dfa_pos(re,state){}



/* codegen_6_dfa_output.js */

function v6_dfa_table(opts,rules){return function(id_D,id_s,id_pos,id_equiv,id_dfa_state,id_dfa_pos){
  return id_D+'='+map_reviver(v6_dfa_table_2(opts,rules))+'\n'
       + v6_dfa_reviver(id_s,id_pos,id_equiv,id_dfa_state,id_dfa_pos)}}

// generate the actual D table
function v6_dfa_table_2(opts,rules){
 return '['+opts.dfa_table.map(v6_dfa_encode(opts)).join(',')+']'}

// wrap the encoded array in a function call that will map revive() over it
// we cannot use [].map(revive) because IE (up to at least 7) does not support it
function map_reviver(array_literal){
 return 'function(a,i,l,b){for(i=0,l=a.length,b=[];i<l;i++)b[i]=a[i]&&revive(a[i]);return b}'
      + '('+array_literal+')'}

// example
// in:  {type:'transition',transition:[[[48,58],{type:'match'}]]}
// out: [[[[1]]]]
// a list of states, each of which is
//  a list of transitions, each of which is a tuple of
//   a list of equivalence class ids, and
//   a state id, omitted when = current + 1
function v6_dfa_encode(opts){return function _v6_dfa_encode(dfa){var key,i,l,match={},slots=[],indices=[],index=0,keys=[],equiv_states=[],parents=[],ret=[],equiv_count=0
  // state cache maps state keys onto slots
  go(dfa)
  go2()
  return v6_stringify(ret)
  function go(state){var i,l,a,cset,substate,equiv_classes,tr_keys,slot,st_key,n,our_index
   // if the state already has been assigned a slot, return it
   n=parents.indexOf(state)
   slot=slots.indexOf(state)
   if(n>-1)return '{'+(n-parents.length)+'}'
   if(slot>-1)return slot
   if(state.type=='match') key='[m]'
   if(state.type=='fail') key='[f]'
   if(state.type=='transition'){
    our_index=index++
    slot=slots.length
    slots[slot]=state
    tr_keys=[]
    for(i=0,l=state.transition.length;i<l;i++){a=state.transition[i]
     cset=a[0];substate=a[1]
     equiv_classes=v6_cset_equiv_lookup(opts)(cset)
     st_key=go(substate)
     tr_keys.push(equiv_classes+'→'+st_key)}
    key='['+tr_keys.join(';')+']'}
   n=keys.indexOf(key)
   if(n>-1){
    equiv_states[slot]=n
    equiv_count++}
   else{
    keys[slot]=key
    indices[slot]=our_index
    ret[our_index]=state}
   return key}
  function go2(){var trs,i,l,j,l2,a,state,tr,index,target
   for(i=0,l=slots.length;i<l;i++){state=slots[i]
    assert(state.type='transition')
    if(equiv_states[i])continue
    index=indices[i]
    trs=[]
    for(j=0,l2=state.transition.length;j<l2;j++){tr=state.transition[j]
     target=id(tr[1])
     equiv_classes=v6_cset_equiv_lookup(opts)(tr[0])
     if(target==index+1) trs.push([equiv_classes])
     else                trs.push([equiv_classes,target])}
    ret[index]=trs}}
  function id(state){var slot
   if(state.type=='match')return ret.length
   if(state.type=='fail')throw new Error('v6_dfa_encode: unhandled type')
   assert(state.type=='transition')
   slot=slots.indexOf(state)
   if(equiv_states[slot])slot=equiv_states[slot]
   return indices[slot]}}}

function v6_stringify(x){var a=[],p
 if(x instanceof Array){
  return '['+x.map(v6_stringify).join(',')+']'}
 if(typeof x=='object'){
  for(p in x)a.push(p+':'+v6_stringify(x[p]))
  return '{'+a.join(',')+'}'}
 return String(x)}

function v6_dfa_reviver(id_s,id_pos,id_equiv,id_dfa_state,id_dfa_pos){var function_dfa
 function_dfa=
  // ss     states
  // l_ss   length of ss
  // st     state
  // t      transition
  // a      intermediate array created per state
  // d      dfa array (of states)
    'function dfa(ss){var i,l_ss,st,l_s,t,l_t,a,d=[],j,k,l;'
  +  'for(i=0,l_ss=ss.length;i<l_ss;i++){st=ss[i];'
  +   'a=[];'
  +   'for(j=0,l_s=st.length;j<l_s;j++){t=st[j];'
  +    'for(k=0,l_t=t[0].length;k<l_t;k++){'
  +     'a[t[0][k]]=t[1]===true?l_ss:t[1]}}'
  +   'for(j=0,l=a.length;j<l;j++)if(a[j]==undefined)a[j]=l_ss+1;'
  +   'd[i]=a}' + '\n  '
  +  'return function _dfa(st,i){var eq,pr;'
  +   'while(st<l_ss){'
  +    'eq='+id_equiv+'['+id_s+'.charCodeAt(i++)];'
  +    'st=d[pr=st][eq]}'
      // only after the state transition fails do we test for end-of-chunk
      // if at EOC, then s.charCodeAt(i) == NaN and equiv[NaN] == undefined
  +   'if(eq==undefined&&i>='+id_s+'.length){'
      // we store the previous state (current state is undefined) and position
  +    id_dfa_state+'=pr;'+id_dfa_pos+'=i-1;'
      // return undefined to signal that we need more data
  +    'return'
  +   '}' // close if EOS
  +   id_dfa_state+'=0;'
  +   id_dfa_pos+'=undefined;'
  +   'if(st==l_ss){'+id_pos+'=i;return true}'
  +   'return false'
  +  '}' // close function _dfa()
  + '}' // close function dfa()
 return ''
  + 'function revive(x){var i,l,state,j,l2,all=[],t,ts;'
  +  'if(!x)return;'
  +  'for(i=0,l=x.length;i<l;i++){state=x[i];'
  +   'ts=[];' // transitions
  +   'for(j=0,l2=state.length;j<l2;j++){t=state[j];'
  +    'if(t[1]==l) ts.push([t[0],true]);'
  +    'else ts.push([t[0],t[1]==undefined?i+1:t[1]])}'
  +   'all.push(ts)}'
  +  'return dfa(all)'
  +  '\n '+function_dfa
  + '}'}



/* codegen_6_character_equivalence_classes.js */

function v6_cset_equiv(opts,rules){var p,cgroup_set,big_arr,all_csets,cset_cache,i,char_count,cset_id,equiv_class,equiv_classes,equiv_class_id
 // here we "condense" or collapse the csets into a single array which maps code units which are treated the same in every case in the grammar onto a single value
 cgroup_set=[]
 char_count=65536 // 2^16 distinct UTF-16 code units
 all_csets=[],cset_cache={}
 // first we construct a big array which contains, for each UTF-16 code unit, a list of csets in which it is included.
 big_arr=Array(char_count)
 for(i=0;i<char_count;i++)big_arr[i]=[]
 // collect all the csets in all_csets, and cache them in cset_cache, keyed by canonical string representation
 cset_id=0
 for(p in rules)go(rules[p])
 opts.cset_equiv_class_array=big_arr
 // we fill the big_arr by iterating over each character in each cset
 for(p in cset_cache) populate_big_arr(cset_cache[p])
 // we then iterate over the big array and calculate the quotient set and equivalence relation, character by character
 // in the big array, we replace each character's list of csets with the id of its equivalence class
 // in each cached cset object, we store the id of each equivalence class that contributes to that cset
 equiv_classes={}
 equiv_class_id=0
 for(i=0;i<char_count;i++){
  equiv_class=get_equiv_class(big_arr[i])
  big_arr[i]=equiv_class.id}
 opts.cset_cache=cset_cache
 opts.equiv_classes=equiv_classes
 opts.cset_equiv_class_array=big_arr
 return rules
 function populate_big_arr(cset){var arr,i,l,subset
  subset=CSET.intersection(CSET.fromIntRange(0,char_count-1),cset.cset)
  arr=CSET.toList(subset)
  for(i=0,l=arr.length;i<l;i++){
   big_arr[arr[i]].push(cset.id)}}
 function get_equiv_class(cset_ids){var key
  key='equiv_class_'+cset_ids.join(',')
  if(key in equiv_classes)return equiv_classes[key]
  cset_ids.forEach(function(cset_id){all_csets[cset_id].equivs.push(equiv_class_id)})
  return equiv_classes[key]={id:equiv_class_id++,key:key,member_cset_ids:cset_ids}}
 function go(rule){
  rule.all_csets.forEach(go_cset)
  function go_cset(cset){var key
   key='cset_'+cset.join(',')
   if(key in cset_cache)return
   all_csets[cset_id]=cset_cache[key]={key:key,cset:cset,equivs:[],id:cset_id}
   cset_id++}}}

function v6_cset_equiv_array(opts,rules,varname){
 return varname+'='+v6_rle_if_shorter(opts.cset_equiv_class_array)+ '\n'
      + v6_function_rle_dec+'\n'}

function v6_cset_equiv_lookup(opts){return function _v6_cset_equiv_lookup(cset){var key
  key='cset_'+cset.join(',')
  if(!(key in opts.cset_cache))throw new Error('unknown cset '+key)
  return opts.cset_cache[key].equivs}}



/* codegen_6_run_length_encoding.js */

function v6_rle_enc(arr){var i,l,count,x,ret=[]
 for(x=arr[0],count=1,i=1,l=arr.length;i<l;i++){
  if(arr[i]==x){count++;continue}
  ret.push(count,x)
  x=arr[i]
  count=1}
 ret.push(count,x)
 return ret}

function v6_rle_dec(){}

// RLE encode if the result is shorter by at least 16 chars
function v6_rle_if_shorter(arr){var x,y
 x='rle_dec(['+v6_rle_enc(arr).join(',')+'])'
 y='['+arr.join(',')+']'
 if(y.length - x.length > 16) return x
 return y}

// the decode function as a string literal
v6_function_rle_dec=
 'function rle_dec(a){var r=[],i,l,n,x,ll;'+
  'for(i=0,l=a.length;i<l;i+=2){'+
   'n=a[i];x=a[i+1];'+
   'r.length=ll=r.length+n;'+
   'for(;n;n--)r[ll-n]=x}'+
  'return r}'

// the decode function is used in some of our tests so let's add a shim for it
function v6_rle_dec(a){
 v6_rle_dec=eval('('+v6_function_rle_dec+')')
 return v6_rle_dec(a)}


/* codegen_6_expression_flags.js */

function v6_calculate_flags(opts,rules){var p
 // documented in doc/streaming_expression_flags
 // N.B. flags can also be set in v6_leaf_dfas
 for(p in rules)
  if(p != '_')
   v6_calculate_flags_expr(opts,rules[p],rules)({})(rules[p].expr)
 // special cases for the shadow start rule
 rules._.expr.flags=
  {cache:false
  ,t_bufferout:false
  ,pushpos:false
  ,t_emitstate:false
  ,m_emitstate:false
  ,m_emitclose:false
  ,m_emitlength:false
  ,m_resetpos:false
  ,m_tossbuf:false
  ,f_tossbuf:false}}

function v6_calculate_flags_expr(opts,rule,rules){return function loop(parent){return function(expr,i){var ret={},subs_anon_consume=[],sub_can_emit_named=false,ref_rule
   if(isCset(expr.type)){
    expr.anon_consume=true}
   if(isNamedRef(expr.type)){
    ref_rule=rules[expr.ref]
    if(!ref_rule.elide && !ref_rule.drop && ref_rule.non_drop_ctx){
     expr.can_emit_named=true}
    else expr.anon_consume=true}
   ret.cache=!!expr.toplevel
   expr.subexprs.forEach(loop(expr))                // recurse
   expr.subexprs.forEach(function(sub){
    if(sub.anon_consume) subs_anon_consume.push(sub)
    if(sub.can_emit_named) sub_can_emit_named=true})
   if(isLookahead(expr.type)){
    expr.consumes_anon=false
    expr.can_emit_named=false}
   if(isOrdC(expr.type)){
    expr.anon_consume = !!subs_anon_consume.length
    expr.can_emit_named = sub_can_emit_named
    if(expr.anon_consume && expr.can_emit_named){
     //subs_anon_consume.forEach(makeAnonEmit)
     expr.anon_consume=false}}
   if(isSequence(expr.type)){
    expr.anon_consume = !!subs_anon_consume.length
    expr.can_emit_named = sub_can_emit_named
    if(expr.anon_consume && expr.can_emit_named){
     //subs_anon_consume.forEach(makeAnonEmit)
     expr.anon_consume=false}}
   ret.t_bufferout=!!(  isLookahead(expr.type)
                     || expr.toplevel
                     || isProperSequence(expr) )
   ret.pushpos=!!(  expr.toplevel
                 || isLookahead(expr.type)
                 || expr.emits_anon
                 || isProperSequence(expr) )
   ret.t_emitstate=!!(  expr.toplevel
                     && !rule.elide
                     && !rule.drop
                     && rule.non_drop_ctx )
   ret.m_emitstate=false // used only in streaming
   ret.m_emitclose=ret.t_emitstate
   ret.m_emitanon=false // will only be set by parent expression
   ret.m_emitlength=ret.m_emitclose
   ret.m_resetpos=isPositiveLookahead(expr.type)
   ret.m_tossbuf=ret.t_bufferout
                 && (isLookahead(expr.type) || rule.drop)
   ret.m_emitbuf=ret.t_bufferout && !ret.m_tossbuf
   ret.f_tossbuf=ret.t_bufferout
   assert(!(ret.m_emitbuf&&ret.m_tossbuf),'¬(m_emitbuf ∧ m_tossbuf)')
   assert(ret.t_bufferout==(ret.m_emitbuf!=ret.m_tossbuf),
          't_bufferout implies m_emitbuf xor m_tossbuf')
   expr.flags=ret}}}

function isProperSequence(expr){return isSequence(expr.type) && expr.subexprs.length>1}

function v6_calculate_streamability(opts,rules){var p,parents=[]
 for(p in rules)go(rules[p])
 function go(rule){
  if(parents.indexOf(rule.name)>-1)return explain_cycle(parents,rule.name)
  parents.push(rule.name)
  if(!rule.known_regular)rule.known_regular=go_expr(rule.expr)
  parents.pop()
  return rule.known_regular
  function go_expr(expr){var i,l,res
   if(v6_always_regular(expr.type))return [true]
   if(isNamedRef(expr.type)){
    return annotate(expr.id,go(rules[expr.ref]))}
   for(i=0,l=expr.subexprs.length;i<l;i++){
    res=go_expr(expr.subexprs[i])
    if(!res[0])return annotate(expr.id,res)}
   return [true]}}
 function annotate(id,res){
  if(res[0])return res
  return [false,id+': '+res[1]]}
 function explain_cycle(parents,name){
  return [false,parents.concat([name]).join(' → ')]}}

function v6_always_regular(n){return isCset(n)||isStrLit(n)||isEmpty(n)}

function v6_substitute(name,value){return function self(re){var i,l
  switch(re[0]){
  case 0: case 1: case 8:
   return re
  case 2: case 3:
   return [re[0],re[1].map(self)]
  case 4:
   return [re[0],re[1],re[2],self(re[3])]
  case 5:
   if(re[1]===name)return value
   return re
  case 6: case 7:
   return [re[0],self(re[1])]
  default:
   throw new Error('v6_substitute: unknown re type: '+re[0])}}}


/* cset.js */

/* Character Point Sets */

/* A cset is a subset of integers 0-0x10FFFF, i.e. the set of all Unicode characters. */

/* A cset is stored as an array of ascending integers between 0 and 0x10FFFE.  The first integer in the array is the lowest codepoint included in the set.  The next integer is the next lowest character excluded from the set.  Thus each pair of integers, starting with the first two, defines the low inclusive and high exclusive bounds of a range of codepoints included in the set.  If an array contains an odd number of elements, the final range is extended, as if by appending 0x110000.  Thus in the worst case (a cset containing every second codepoint over the entire range) each codepoint will be appear once and the entire array will have 0x10FFFF or 1114111 elements.  However in typical cases, characters are included or excluded in mostly continuous ranges, so this representation tends to be efficient in practice. */

/* A few related functions are found in cset_unicode_properties.js, including an extra constructor and the code which generates csets from the Unicode character data. */

/* The _CSET function here is not called directly, instead we munge this a bit in src/cset_output.js and the output of that (as found in build/cset_prod.js) is what actually gives the CSET module. */

;(function(exports){

var cset_unicode_categories=
{
  "Cc": [
    0,
    32,
    127,
    160
  ],
  "Zs": [
    32,
    33,
    160,
    161,
    5760,
    5761,
    6158,
    6159,
    8192,
    8203,
    8239,
    8240,
    8287,
    8288,
    12288,
    12289
  ],
  "Po": [
    33,
    36,
    37,
    40,
    42,
    43,
    44,
    45,
    46,
    48,
    58,
    60,
    63,
    65,
    92,
    93,
    161,
    162,
    183,
    184,
    191,
    192,
    894,
    895,
    903,
    904,
    1370,
    1376,
    1417,
    1418,
    1472,
    1473,
    1475,
    1476,
    1478,
    1479,
    1523,
    1525,
    1545,
    1547,
    1548,
    1550,
    1563,
    1564,
    1566,
    1568,
    1642,
    1646,
    1748,
    1749,
    1792,
    1806,
    2039,
    2042,
    2096,
    2111,
    2404,
    2406,
    2416,
    2417,
    3572,
    3573,
    3663,
    3664,
    3674,
    3676,
    3844,
    3859,
    3973,
    3974,
    4048,
    4053,
    4170,
    4176,
    4347,
    4348,
    4961,
    4969,
    5741,
    5743,
    5867,
    5870,
    5941,
    5943,
    6100,
    6103,
    6104,
    6107,
    6144,
    6150,
    6151,
    6155,
    6468,
    6470,
    6622,
    6624,
    6686,
    6688,
    6816,
    6823,
    6824,
    6830,
    7002,
    7009,
    7227,
    7232,
    7294,
    7296,
    7379,
    7380,
    8214,
    8216,
    8224,
    8232,
    8240,
    8249,
    8251,
    8255,
    8257,
    8260,
    8263,
    8274,
    8275,
    8276,
    8277,
    8287,
    11513,
    11517,
    11518,
    11520,
    11776,
    11778,
    11782,
    11785,
    11787,
    11788,
    11790,
    11799,
    11800,
    11802,
    11803,
    11804,
    11806,
    11808,
    11818,
    11823,
    11824,
    11826,
    12289,
    12292,
    12349,
    12350,
    12539,
    12540,
    42238,
    42240,
    42509,
    42512,
    42611,
    42612,
    42622,
    42623,
    42738,
    42744,
    43124,
    43128,
    43214,
    43216,
    43256,
    43259,
    43310,
    43312,
    43359,
    43360,
    43457,
    43470,
    43486,
    43488,
    43612,
    43616,
    43742,
    43744,
    44011,
    44012,
    65040,
    65047,
    65049,
    65050,
    65072,
    65073,
    65093,
    65095,
    65097,
    65101,
    65104,
    65107,
    65108,
    65112,
    65119,
    65122,
    65128,
    65129,
    65130,
    65132,
    65281,
    65284,
    65285,
    65288,
    65290,
    65291,
    65292,
    65293,
    65294,
    65296,
    65306,
    65308,
    65311,
    65313,
    65340,
    65341,
    65377,
    65378,
    65380,
    65382,
    65792,
    65794,
    66463,
    66464,
    66512,
    66513,
    67671,
    67672,
    67871,
    67872,
    67903,
    67904,
    68176,
    68185,
    68223,
    68224,
    68409,
    68416,
    69819,
    69821,
    69822,
    69826,
    74864,
    74868
  ],
  "Sc": [
    36,
    37,
    162,
    166,
    1547,
    1548,
    2546,
    2548,
    2555,
    2556,
    2801,
    2802,
    3065,
    3066,
    3647,
    3648,
    6107,
    6108,
    8352,
    8377,
    43064,
    43065,
    65020,
    65021,
    65129,
    65130,
    65284,
    65285,
    65504,
    65506,
    65509,
    65511
  ],
  "Ps": [
    40,
    41,
    91,
    92,
    123,
    124,
    3898,
    3899,
    3900,
    3901,
    5787,
    5788,
    8218,
    8219,
    8222,
    8223,
    8261,
    8262,
    8317,
    8318,
    8333,
    8334,
    9001,
    9002,
    10088,
    10089,
    10090,
    10091,
    10092,
    10093,
    10094,
    10095,
    10096,
    10097,
    10098,
    10099,
    10100,
    10101,
    10181,
    10182,
    10214,
    10215,
    10216,
    10217,
    10218,
    10219,
    10220,
    10221,
    10222,
    10223,
    10627,
    10628,
    10629,
    10630,
    10631,
    10632,
    10633,
    10634,
    10635,
    10636,
    10637,
    10638,
    10639,
    10640,
    10641,
    10642,
    10643,
    10644,
    10645,
    10646,
    10647,
    10648,
    10712,
    10713,
    10714,
    10715,
    10748,
    10749,
    11810,
    11811,
    11812,
    11813,
    11814,
    11815,
    11816,
    11817,
    12296,
    12297,
    12298,
    12299,
    12300,
    12301,
    12302,
    12303,
    12304,
    12305,
    12308,
    12309,
    12310,
    12311,
    12312,
    12313,
    12314,
    12315,
    12317,
    12318,
    64830,
    64831,
    65047,
    65048,
    65077,
    65078,
    65079,
    65080,
    65081,
    65082,
    65083,
    65084,
    65085,
    65086,
    65087,
    65088,
    65089,
    65090,
    65091,
    65092,
    65095,
    65096,
    65113,
    65114,
    65115,
    65116,
    65117,
    65118,
    65288,
    65289,
    65339,
    65340,
    65371,
    65372,
    65375,
    65376,
    65378,
    65379
  ],
  "Pe": [
    41,
    42,
    93,
    94,
    125,
    126,
    3899,
    3900,
    3901,
    3902,
    5788,
    5789,
    8262,
    8263,
    8318,
    8319,
    8334,
    8335,
    9002,
    9003,
    10089,
    10090,
    10091,
    10092,
    10093,
    10094,
    10095,
    10096,
    10097,
    10098,
    10099,
    10100,
    10101,
    10102,
    10182,
    10183,
    10215,
    10216,
    10217,
    10218,
    10219,
    10220,
    10221,
    10222,
    10223,
    10224,
    10628,
    10629,
    10630,
    10631,
    10632,
    10633,
    10634,
    10635,
    10636,
    10637,
    10638,
    10639,
    10640,
    10641,
    10642,
    10643,
    10644,
    10645,
    10646,
    10647,
    10648,
    10649,
    10713,
    10714,
    10715,
    10716,
    10749,
    10750,
    11811,
    11812,
    11813,
    11814,
    11815,
    11816,
    11817,
    11818,
    12297,
    12298,
    12299,
    12300,
    12301,
    12302,
    12303,
    12304,
    12305,
    12306,
    12309,
    12310,
    12311,
    12312,
    12313,
    12314,
    12315,
    12316,
    12318,
    12320,
    64831,
    64832,
    65048,
    65049,
    65078,
    65079,
    65080,
    65081,
    65082,
    65083,
    65084,
    65085,
    65086,
    65087,
    65088,
    65089,
    65090,
    65091,
    65092,
    65093,
    65096,
    65097,
    65114,
    65115,
    65116,
    65117,
    65118,
    65119,
    65289,
    65290,
    65341,
    65342,
    65373,
    65374,
    65376,
    65377,
    65379,
    65380
  ],
  "Sm": [
    43,
    44,
    60,
    63,
    124,
    125,
    126,
    127,
    172,
    173,
    177,
    178,
    215,
    216,
    247,
    248,
    1014,
    1015,
    1542,
    1545,
    8260,
    8261,
    8274,
    8275,
    8314,
    8317,
    8330,
    8333,
    8512,
    8517,
    8523,
    8524,
    8592,
    8597,
    8602,
    8604,
    8608,
    8609,
    8611,
    8612,
    8614,
    8615,
    8622,
    8623,
    8654,
    8656,
    8658,
    8659,
    8660,
    8661,
    8692,
    8960,
    8968,
    8972,
    8992,
    8994,
    9084,
    9085,
    9115,
    9140,
    9180,
    9186,
    9655,
    9656,
    9665,
    9666,
    9720,
    9728,
    9839,
    9840,
    10176,
    10181,
    10183,
    10187,
    10188,
    10189,
    10192,
    10214,
    10224,
    10240,
    10496,
    10627,
    10649,
    10712,
    10716,
    10748,
    10750,
    11008,
    11056,
    11077,
    11079,
    11085,
    64297,
    64298,
    65122,
    65123,
    65124,
    65127,
    65291,
    65292,
    65308,
    65311,
    65372,
    65373,
    65374,
    65375,
    65506,
    65507,
    65513,
    65517,
    120513,
    120514,
    120539,
    120540,
    120571,
    120572,
    120597,
    120598,
    120629,
    120630,
    120655,
    120656,
    120687,
    120688,
    120713,
    120714,
    120745,
    120746,
    120771,
    120772
  ],
  "Pd": [
    45,
    46,
    1418,
    1419,
    1470,
    1471,
    5120,
    5121,
    6150,
    6151,
    8208,
    8214,
    11799,
    11800,
    11802,
    11803,
    12316,
    12317,
    12336,
    12337,
    12448,
    12449,
    65073,
    65075,
    65112,
    65113,
    65123,
    65124,
    65293,
    65294
  ],
  "Nd": [
    48,
    58,
    1632,
    1642,
    1776,
    1786,
    1984,
    1994,
    2406,
    2416,
    2534,
    2544,
    2662,
    2672,
    2790,
    2800,
    2918,
    2928,
    3046,
    3056,
    3174,
    3184,
    3302,
    3312,
    3430,
    3440,
    3664,
    3674,
    3792,
    3802,
    3872,
    3882,
    4160,
    4170,
    4240,
    4250,
    6112,
    6122,
    6160,
    6170,
    6470,
    6480,
    6608,
    6619,
    6784,
    6794,
    6800,
    6810,
    6992,
    7002,
    7088,
    7098,
    7232,
    7242,
    7248,
    7258,
    42528,
    42538,
    43216,
    43226,
    43264,
    43274,
    43472,
    43482,
    43600,
    43610,
    44016,
    44026,
    65296,
    65306,
    66720,
    66730,
    120782,
    120832
  ],
  "Lu": [
    65,
    91,
    192,
    215,
    216,
    223,
    256,
    257,
    258,
    259,
    260,
    261,
    262,
    263,
    264,
    265,
    266,
    267,
    268,
    269,
    270,
    271,
    272,
    273,
    274,
    275,
    276,
    277,
    278,
    279,
    280,
    281,
    282,
    283,
    284,
    285,
    286,
    287,
    288,
    289,
    290,
    291,
    292,
    293,
    294,
    295,
    296,
    297,
    298,
    299,
    300,
    301,
    302,
    303,
    304,
    305,
    306,
    307,
    308,
    309,
    310,
    311,
    313,
    314,
    315,
    316,
    317,
    318,
    319,
    320,
    321,
    322,
    323,
    324,
    325,
    326,
    327,
    328,
    330,
    331,
    332,
    333,
    334,
    335,
    336,
    337,
    338,
    339,
    340,
    341,
    342,
    343,
    344,
    345,
    346,
    347,
    348,
    349,
    350,
    351,
    352,
    353,
    354,
    355,
    356,
    357,
    358,
    359,
    360,
    361,
    362,
    363,
    364,
    365,
    366,
    367,
    368,
    369,
    370,
    371,
    372,
    373,
    374,
    375,
    376,
    378,
    379,
    380,
    381,
    382,
    385,
    387,
    388,
    389,
    390,
    392,
    393,
    396,
    398,
    402,
    403,
    405,
    406,
    409,
    412,
    414,
    415,
    417,
    418,
    419,
    420,
    421,
    422,
    424,
    425,
    426,
    428,
    429,
    430,
    432,
    433,
    436,
    437,
    438,
    439,
    441,
    444,
    445,
    452,
    453,
    455,
    456,
    458,
    459,
    461,
    462,
    463,
    464,
    465,
    466,
    467,
    468,
    469,
    470,
    471,
    472,
    473,
    474,
    475,
    476,
    478,
    479,
    480,
    481,
    482,
    483,
    484,
    485,
    486,
    487,
    488,
    489,
    490,
    491,
    492,
    493,
    494,
    495,
    497,
    498,
    500,
    501,
    502,
    505,
    506,
    507,
    508,
    509,
    510,
    511,
    512,
    513,
    514,
    515,
    516,
    517,
    518,
    519,
    520,
    521,
    522,
    523,
    524,
    525,
    526,
    527,
    528,
    529,
    530,
    531,
    532,
    533,
    534,
    535,
    536,
    537,
    538,
    539,
    540,
    541,
    542,
    543,
    544,
    545,
    546,
    547,
    548,
    549,
    550,
    551,
    552,
    553,
    554,
    555,
    556,
    557,
    558,
    559,
    560,
    561,
    562,
    563,
    570,
    572,
    573,
    575,
    577,
    578,
    579,
    583,
    584,
    585,
    586,
    587,
    588,
    589,
    590,
    591,
    880,
    881,
    882,
    883,
    886,
    887,
    902,
    903,
    904,
    907,
    908,
    909,
    910,
    912,
    913,
    930,
    931,
    940,
    975,
    976,
    978,
    981,
    984,
    985,
    986,
    987,
    988,
    989,
    990,
    991,
    992,
    993,
    994,
    995,
    996,
    997,
    998,
    999,
    1000,
    1001,
    1002,
    1003,
    1004,
    1005,
    1006,
    1007,
    1012,
    1013,
    1015,
    1016,
    1017,
    1019,
    1021,
    1072,
    1120,
    1121,
    1122,
    1123,
    1124,
    1125,
    1126,
    1127,
    1128,
    1129,
    1130,
    1131,
    1132,
    1133,
    1134,
    1135,
    1136,
    1137,
    1138,
    1139,
    1140,
    1141,
    1142,
    1143,
    1144,
    1145,
    1146,
    1147,
    1148,
    1149,
    1150,
    1151,
    1152,
    1153,
    1162,
    1163,
    1164,
    1165,
    1166,
    1167,
    1168,
    1169,
    1170,
    1171,
    1172,
    1173,
    1174,
    1175,
    1176,
    1177,
    1178,
    1179,
    1180,
    1181,
    1182,
    1183,
    1184,
    1185,
    1186,
    1187,
    1188,
    1189,
    1190,
    1191,
    1192,
    1193,
    1194,
    1195,
    1196,
    1197,
    1198,
    1199,
    1200,
    1201,
    1202,
    1203,
    1204,
    1205,
    1206,
    1207,
    1208,
    1209,
    1210,
    1211,
    1212,
    1213,
    1214,
    1215,
    1216,
    1218,
    1219,
    1220,
    1221,
    1222,
    1223,
    1224,
    1225,
    1226,
    1227,
    1228,
    1229,
    1230,
    1232,
    1233,
    1234,
    1235,
    1236,
    1237,
    1238,
    1239,
    1240,
    1241,
    1242,
    1243,
    1244,
    1245,
    1246,
    1247,
    1248,
    1249,
    1250,
    1251,
    1252,
    1253,
    1254,
    1255,
    1256,
    1257,
    1258,
    1259,
    1260,
    1261,
    1262,
    1263,
    1264,
    1265,
    1266,
    1267,
    1268,
    1269,
    1270,
    1271,
    1272,
    1273,
    1274,
    1275,
    1276,
    1277,
    1278,
    1279,
    1280,
    1281,
    1282,
    1283,
    1284,
    1285,
    1286,
    1287,
    1288,
    1289,
    1290,
    1291,
    1292,
    1293,
    1294,
    1295,
    1296,
    1297,
    1298,
    1299,
    1300,
    1301,
    1302,
    1303,
    1304,
    1305,
    1306,
    1307,
    1308,
    1309,
    1310,
    1311,
    1312,
    1313,
    1314,
    1315,
    1316,
    1317,
    1329,
    1367,
    4256,
    4294,
    7680,
    7681,
    7682,
    7683,
    7684,
    7685,
    7686,
    7687,
    7688,
    7689,
    7690,
    7691,
    7692,
    7693,
    7694,
    7695,
    7696,
    7697,
    7698,
    7699,
    7700,
    7701,
    7702,
    7703,
    7704,
    7705,
    7706,
    7707,
    7708,
    7709,
    7710,
    7711,
    7712,
    7713,
    7714,
    7715,
    7716,
    7717,
    7718,
    7719,
    7720,
    7721,
    7722,
    7723,
    7724,
    7725,
    7726,
    7727,
    7728,
    7729,
    7730,
    7731,
    7732,
    7733,
    7734,
    7735,
    7736,
    7737,
    7738,
    7739,
    7740,
    7741,
    7742,
    7743,
    7744,
    7745,
    7746,
    7747,
    7748,
    7749,
    7750,
    7751,
    7752,
    7753,
    7754,
    7755,
    7756,
    7757,
    7758,
    7759,
    7760,
    7761,
    7762,
    7763,
    7764,
    7765,
    7766,
    7767,
    7768,
    7769,
    7770,
    7771,
    7772,
    7773,
    7774,
    7775,
    7776,
    7777,
    7778,
    7779,
    7780,
    7781,
    7782,
    7783,
    7784,
    7785,
    7786,
    7787,
    7788,
    7789,
    7790,
    7791,
    7792,
    7793,
    7794,
    7795,
    7796,
    7797,
    7798,
    7799,
    7800,
    7801,
    7802,
    7803,
    7804,
    7805,
    7806,
    7807,
    7808,
    7809,
    7810,
    7811,
    7812,
    7813,
    7814,
    7815,
    7816,
    7817,
    7818,
    7819,
    7820,
    7821,
    7822,
    7823,
    7824,
    7825,
    7826,
    7827,
    7828,
    7829,
    7838,
    7839,
    7840,
    7841,
    7842,
    7843,
    7844,
    7845,
    7846,
    7847,
    7848,
    7849,
    7850,
    7851,
    7852,
    7853,
    7854,
    7855,
    7856,
    7857,
    7858,
    7859,
    7860,
    7861,
    7862,
    7863,
    7864,
    7865,
    7866,
    7867,
    7868,
    7869,
    7870,
    7871,
    7872,
    7873,
    7874,
    7875,
    7876,
    7877,
    7878,
    7879,
    7880,
    7881,
    7882,
    7883,
    7884,
    7885,
    7886,
    7887,
    7888,
    7889,
    7890,
    7891,
    7892,
    7893,
    7894,
    7895,
    7896,
    7897,
    7898,
    7899,
    7900,
    7901,
    7902,
    7903,
    7904,
    7905,
    7906,
    7907,
    7908,
    7909,
    7910,
    7911,
    7912,
    7913,
    7914,
    7915,
    7916,
    7917,
    7918,
    7919,
    7920,
    7921,
    7922,
    7923,
    7924,
    7925,
    7926,
    7927,
    7928,
    7929,
    7930,
    7931,
    7932,
    7933,
    7934,
    7935,
    7944,
    7952,
    7960,
    7966,
    7976,
    7984,
    7992,
    8000,
    8008,
    8014,
    8025,
    8026,
    8027,
    8028,
    8029,
    8030,
    8031,
    8032,
    8040,
    8048,
    8120,
    8124,
    8136,
    8140,
    8152,
    8156,
    8168,
    8173,
    8184,
    8188,
    8450,
    8451,
    8455,
    8456,
    8459,
    8462,
    8464,
    8467,
    8469,
    8470,
    8473,
    8478,
    8484,
    8485,
    8486,
    8487,
    8488,
    8489,
    8490,
    8494,
    8496,
    8500,
    8510,
    8512,
    8517,
    8518,
    8579,
    8580,
    11264,
    11311,
    11360,
    11361,
    11362,
    11365,
    11367,
    11368,
    11369,
    11370,
    11371,
    11372,
    11373,
    11377,
    11378,
    11379,
    11381,
    11382,
    11390,
    11393,
    11394,
    11395,
    11396,
    11397,
    11398,
    11399,
    11400,
    11401,
    11402,
    11403,
    11404,
    11405,
    11406,
    11407,
    11408,
    11409,
    11410,
    11411,
    11412,
    11413,
    11414,
    11415,
    11416,
    11417,
    11418,
    11419,
    11420,
    11421,
    11422,
    11423,
    11424,
    11425,
    11426,
    11427,
    11428,
    11429,
    11430,
    11431,
    11432,
    11433,
    11434,
    11435,
    11436,
    11437,
    11438,
    11439,
    11440,
    11441,
    11442,
    11443,
    11444,
    11445,
    11446,
    11447,
    11448,
    11449,
    11450,
    11451,
    11452,
    11453,
    11454,
    11455,
    11456,
    11457,
    11458,
    11459,
    11460,
    11461,
    11462,
    11463,
    11464,
    11465,
    11466,
    11467,
    11468,
    11469,
    11470,
    11471,
    11472,
    11473,
    11474,
    11475,
    11476,
    11477,
    11478,
    11479,
    11480,
    11481,
    11482,
    11483,
    11484,
    11485,
    11486,
    11487,
    11488,
    11489,
    11490,
    11491,
    11499,
    11500,
    11501,
    11502,
    42560,
    42561,
    42562,
    42563,
    42564,
    42565,
    42566,
    42567,
    42568,
    42569,
    42570,
    42571,
    42572,
    42573,
    42574,
    42575,
    42576,
    42577,
    42578,
    42579,
    42580,
    42581,
    42582,
    42583,
    42584,
    42585,
    42586,
    42587,
    42588,
    42589,
    42590,
    42591,
    42594,
    42595,
    42596,
    42597,
    42598,
    42599,
    42600,
    42601,
    42602,
    42603,
    42604,
    42605,
    42624,
    42625,
    42626,
    42627,
    42628,
    42629,
    42630,
    42631,
    42632,
    42633,
    42634,
    42635,
    42636,
    42637,
    42638,
    42639,
    42640,
    42641,
    42642,
    42643,
    42644,
    42645,
    42646,
    42647,
    42786,
    42787,
    42788,
    42789,
    42790,
    42791,
    42792,
    42793,
    42794,
    42795,
    42796,
    42797,
    42798,
    42799,
    42802,
    42803,
    42804,
    42805,
    42806,
    42807,
    42808,
    42809,
    42810,
    42811,
    42812,
    42813,
    42814,
    42815,
    42816,
    42817,
    42818,
    42819,
    42820,
    42821,
    42822,
    42823,
    42824,
    42825,
    42826,
    42827,
    42828,
    42829,
    42830,
    42831,
    42832,
    42833,
    42834,
    42835,
    42836,
    42837,
    42838,
    42839,
    42840,
    42841,
    42842,
    42843,
    42844,
    42845,
    42846,
    42847,
    42848,
    42849,
    42850,
    42851,
    42852,
    42853,
    42854,
    42855,
    42856,
    42857,
    42858,
    42859,
    42860,
    42861,
    42862,
    42863,
    42873,
    42874,
    42875,
    42876,
    42877,
    42879,
    42880,
    42881,
    42882,
    42883,
    42884,
    42885,
    42886,
    42887,
    42891,
    42892,
    65313,
    65339,
    66560,
    66600,
    119808,
    119834,
    119860,
    119886,
    119912,
    119938,
    119964,
    119965,
    119966,
    119968,
    119970,
    119971,
    119973,
    119975,
    119977,
    119981,
    119982,
    119990,
    120016,
    120042,
    120068,
    120070,
    120071,
    120075,
    120077,
    120085,
    120086,
    120093,
    120120,
    120122,
    120123,
    120127,
    120128,
    120133,
    120134,
    120135,
    120138,
    120145,
    120172,
    120198,
    120224,
    120250,
    120276,
    120302,
    120328,
    120354,
    120380,
    120406,
    120432,
    120458,
    120488,
    120513,
    120546,
    120571,
    120604,
    120629,
    120662,
    120687,
    120720,
    120745,
    120778,
    120779
  ],
  "Sk": [
    94,
    95,
    96,
    97,
    168,
    169,
    175,
    176,
    180,
    181,
    184,
    185,
    706,
    710,
    722,
    736,
    741,
    748,
    749,
    750,
    751,
    768,
    885,
    886,
    900,
    902,
    8125,
    8126,
    8127,
    8130,
    8141,
    8144,
    8157,
    8160,
    8173,
    8176,
    8189,
    8191,
    12443,
    12445,
    42752,
    42775,
    42784,
    42786,
    42889,
    42891,
    65342,
    65343,
    65344,
    65345,
    65507,
    65508
  ],
  "Pc": [
    95,
    96,
    8255,
    8257,
    8276,
    8277,
    65075,
    65077,
    65101,
    65104,
    65343,
    65344
  ],
  "Ll": [
    97,
    123,
    170,
    171,
    181,
    182,
    186,
    187,
    223,
    247,
    248,
    256,
    257,
    258,
    259,
    260,
    261,
    262,
    263,
    264,
    265,
    266,
    267,
    268,
    269,
    270,
    271,
    272,
    273,
    274,
    275,
    276,
    277,
    278,
    279,
    280,
    281,
    282,
    283,
    284,
    285,
    286,
    287,
    288,
    289,
    290,
    291,
    292,
    293,
    294,
    295,
    296,
    297,
    298,
    299,
    300,
    301,
    302,
    303,
    304,
    305,
    306,
    307,
    308,
    309,
    310,
    311,
    313,
    314,
    315,
    316,
    317,
    318,
    319,
    320,
    321,
    322,
    323,
    324,
    325,
    326,
    327,
    328,
    330,
    331,
    332,
    333,
    334,
    335,
    336,
    337,
    338,
    339,
    340,
    341,
    342,
    343,
    344,
    345,
    346,
    347,
    348,
    349,
    350,
    351,
    352,
    353,
    354,
    355,
    356,
    357,
    358,
    359,
    360,
    361,
    362,
    363,
    364,
    365,
    366,
    367,
    368,
    369,
    370,
    371,
    372,
    373,
    374,
    375,
    376,
    378,
    379,
    380,
    381,
    382,
    385,
    387,
    388,
    389,
    390,
    392,
    393,
    396,
    398,
    402,
    403,
    405,
    406,
    409,
    412,
    414,
    415,
    417,
    418,
    419,
    420,
    421,
    422,
    424,
    425,
    426,
    428,
    429,
    430,
    432,
    433,
    436,
    437,
    438,
    439,
    441,
    443,
    445,
    448,
    454,
    455,
    457,
    458,
    460,
    461,
    462,
    463,
    464,
    465,
    466,
    467,
    468,
    469,
    470,
    471,
    472,
    473,
    474,
    475,
    476,
    478,
    479,
    480,
    481,
    482,
    483,
    484,
    485,
    486,
    487,
    488,
    489,
    490,
    491,
    492,
    493,
    494,
    495,
    497,
    499,
    500,
    501,
    502,
    505,
    506,
    507,
    508,
    509,
    510,
    511,
    512,
    513,
    514,
    515,
    516,
    517,
    518,
    519,
    520,
    521,
    522,
    523,
    524,
    525,
    526,
    527,
    528,
    529,
    530,
    531,
    532,
    533,
    534,
    535,
    536,
    537,
    538,
    539,
    540,
    541,
    542,
    543,
    544,
    545,
    546,
    547,
    548,
    549,
    550,
    551,
    552,
    553,
    554,
    555,
    556,
    557,
    558,
    559,
    560,
    561,
    562,
    563,
    570,
    572,
    573,
    575,
    577,
    578,
    579,
    583,
    584,
    585,
    586,
    587,
    588,
    589,
    590,
    591,
    660,
    661,
    688,
    881,
    882,
    883,
    884,
    887,
    888,
    891,
    894,
    912,
    913,
    940,
    975,
    976,
    978,
    981,
    984,
    985,
    986,
    987,
    988,
    989,
    990,
    991,
    992,
    993,
    994,
    995,
    996,
    997,
    998,
    999,
    1000,
    1001,
    1002,
    1003,
    1004,
    1005,
    1006,
    1007,
    1012,
    1013,
    1014,
    1016,
    1017,
    1019,
    1021,
    1072,
    1120,
    1121,
    1122,
    1123,
    1124,
    1125,
    1126,
    1127,
    1128,
    1129,
    1130,
    1131,
    1132,
    1133,
    1134,
    1135,
    1136,
    1137,
    1138,
    1139,
    1140,
    1141,
    1142,
    1143,
    1144,
    1145,
    1146,
    1147,
    1148,
    1149,
    1150,
    1151,
    1152,
    1153,
    1154,
    1163,
    1164,
    1165,
    1166,
    1167,
    1168,
    1169,
    1170,
    1171,
    1172,
    1173,
    1174,
    1175,
    1176,
    1177,
    1178,
    1179,
    1180,
    1181,
    1182,
    1183,
    1184,
    1185,
    1186,
    1187,
    1188,
    1189,
    1190,
    1191,
    1192,
    1193,
    1194,
    1195,
    1196,
    1197,
    1198,
    1199,
    1200,
    1201,
    1202,
    1203,
    1204,
    1205,
    1206,
    1207,
    1208,
    1209,
    1210,
    1211,
    1212,
    1213,
    1214,
    1215,
    1216,
    1218,
    1219,
    1220,
    1221,
    1222,
    1223,
    1224,
    1225,
    1226,
    1227,
    1228,
    1229,
    1230,
    1232,
    1233,
    1234,
    1235,
    1236,
    1237,
    1238,
    1239,
    1240,
    1241,
    1242,
    1243,
    1244,
    1245,
    1246,
    1247,
    1248,
    1249,
    1250,
    1251,
    1252,
    1253,
    1254,
    1255,
    1256,
    1257,
    1258,
    1259,
    1260,
    1261,
    1262,
    1263,
    1264,
    1265,
    1266,
    1267,
    1268,
    1269,
    1270,
    1271,
    1272,
    1273,
    1274,
    1275,
    1276,
    1277,
    1278,
    1279,
    1280,
    1281,
    1282,
    1283,
    1284,
    1285,
    1286,
    1287,
    1288,
    1289,
    1290,
    1291,
    1292,
    1293,
    1294,
    1295,
    1296,
    1297,
    1298,
    1299,
    1300,
    1301,
    1302,
    1303,
    1304,
    1305,
    1306,
    1307,
    1308,
    1309,
    1310,
    1311,
    1312,
    1313,
    1314,
    1315,
    1316,
    1317,
    1318,
    1377,
    1416,
    7424,
    7468,
    7522,
    7544,
    7545,
    7579,
    7681,
    7682,
    7683,
    7684,
    7685,
    7686,
    7687,
    7688,
    7689,
    7690,
    7691,
    7692,
    7693,
    7694,
    7695,
    7696,
    7697,
    7698,
    7699,
    7700,
    7701,
    7702,
    7703,
    7704,
    7705,
    7706,
    7707,
    7708,
    7709,
    7710,
    7711,
    7712,
    7713,
    7714,
    7715,
    7716,
    7717,
    7718,
    7719,
    7720,
    7721,
    7722,
    7723,
    7724,
    7725,
    7726,
    7727,
    7728,
    7729,
    7730,
    7731,
    7732,
    7733,
    7734,
    7735,
    7736,
    7737,
    7738,
    7739,
    7740,
    7741,
    7742,
    7743,
    7744,
    7745,
    7746,
    7747,
    7748,
    7749,
    7750,
    7751,
    7752,
    7753,
    7754,
    7755,
    7756,
    7757,
    7758,
    7759,
    7760,
    7761,
    7762,
    7763,
    7764,
    7765,
    7766,
    7767,
    7768,
    7769,
    7770,
    7771,
    7772,
    7773,
    7774,
    7775,
    7776,
    7777,
    7778,
    7779,
    7780,
    7781,
    7782,
    7783,
    7784,
    7785,
    7786,
    7787,
    7788,
    7789,
    7790,
    7791,
    7792,
    7793,
    7794,
    7795,
    7796,
    7797,
    7798,
    7799,
    7800,
    7801,
    7802,
    7803,
    7804,
    7805,
    7806,
    7807,
    7808,
    7809,
    7810,
    7811,
    7812,
    7813,
    7814,
    7815,
    7816,
    7817,
    7818,
    7819,
    7820,
    7821,
    7822,
    7823,
    7824,
    7825,
    7826,
    7827,
    7828,
    7829,
    7838,
    7839,
    7840,
    7841,
    7842,
    7843,
    7844,
    7845,
    7846,
    7847,
    7848,
    7849,
    7850,
    7851,
    7852,
    7853,
    7854,
    7855,
    7856,
    7857,
    7858,
    7859,
    7860,
    7861,
    7862,
    7863,
    7864,
    7865,
    7866,
    7867,
    7868,
    7869,
    7870,
    7871,
    7872,
    7873,
    7874,
    7875,
    7876,
    7877,
    7878,
    7879,
    7880,
    7881,
    7882,
    7883,
    7884,
    7885,
    7886,
    7887,
    7888,
    7889,
    7890,
    7891,
    7892,
    7893,
    7894,
    7895,
    7896,
    7897,
    7898,
    7899,
    7900,
    7901,
    7902,
    7903,
    7904,
    7905,
    7906,
    7907,
    7908,
    7909,
    7910,
    7911,
    7912,
    7913,
    7914,
    7915,
    7916,
    7917,
    7918,
    7919,
    7920,
    7921,
    7922,
    7923,
    7924,
    7925,
    7926,
    7927,
    7928,
    7929,
    7930,
    7931,
    7932,
    7933,
    7934,
    7935,
    7944,
    7952,
    7958,
    7968,
    7976,
    7984,
    7992,
    8000,
    8006,
    8016,
    8024,
    8032,
    8040,
    8048,
    8062,
    8064,
    8072,
    8080,
    8088,
    8096,
    8104,
    8112,
    8117,
    8118,
    8120,
    8126,
    8127,
    8130,
    8133,
    8134,
    8136,
    8144,
    8148,
    8150,
    8152,
    8160,
    8168,
    8178,
    8181,
    8182,
    8184,
    8458,
    8459,
    8462,
    8464,
    8467,
    8468,
    8495,
    8496,
    8500,
    8501,
    8505,
    8506,
    8508,
    8510,
    8518,
    8522,
    8526,
    8527,
    8580,
    8581,
    11312,
    11359,
    11361,
    11362,
    11365,
    11367,
    11368,
    11369,
    11370,
    11371,
    11372,
    11373,
    11377,
    11378,
    11379,
    11381,
    11382,
    11389,
    11393,
    11394,
    11395,
    11396,
    11397,
    11398,
    11399,
    11400,
    11401,
    11402,
    11403,
    11404,
    11405,
    11406,
    11407,
    11408,
    11409,
    11410,
    11411,
    11412,
    11413,
    11414,
    11415,
    11416,
    11417,
    11418,
    11419,
    11420,
    11421,
    11422,
    11423,
    11424,
    11425,
    11426,
    11427,
    11428,
    11429,
    11430,
    11431,
    11432,
    11433,
    11434,
    11435,
    11436,
    11437,
    11438,
    11439,
    11440,
    11441,
    11442,
    11443,
    11444,
    11445,
    11446,
    11447,
    11448,
    11449,
    11450,
    11451,
    11452,
    11453,
    11454,
    11455,
    11456,
    11457,
    11458,
    11459,
    11460,
    11461,
    11462,
    11463,
    11464,
    11465,
    11466,
    11467,
    11468,
    11469,
    11470,
    11471,
    11472,
    11473,
    11474,
    11475,
    11476,
    11477,
    11478,
    11479,
    11480,
    11481,
    11482,
    11483,
    11484,
    11485,
    11486,
    11487,
    11488,
    11489,
    11490,
    11491,
    11493,
    11500,
    11501,
    11502,
    11503,
    11520,
    11558,
    42561,
    42562,
    42563,
    42564,
    42565,
    42566,
    42567,
    42568,
    42569,
    42570,
    42571,
    42572,
    42573,
    42574,
    42575,
    42576,
    42577,
    42578,
    42579,
    42580,
    42581,
    42582,
    42583,
    42584,
    42585,
    42586,
    42587,
    42588,
    42589,
    42590,
    42591,
    42592,
    42595,
    42596,
    42597,
    42598,
    42599,
    42600,
    42601,
    42602,
    42603,
    42604,
    42605,
    42606,
    42625,
    42626,
    42627,
    42628,
    42629,
    42630,
    42631,
    42632,
    42633,
    42634,
    42635,
    42636,
    42637,
    42638,
    42639,
    42640,
    42641,
    42642,
    42643,
    42644,
    42645,
    42646,
    42647,
    42648,
    42787,
    42788,
    42789,
    42790,
    42791,
    42792,
    42793,
    42794,
    42795,
    42796,
    42797,
    42798,
    42799,
    42802,
    42803,
    42804,
    42805,
    42806,
    42807,
    42808,
    42809,
    42810,
    42811,
    42812,
    42813,
    42814,
    42815,
    42816,
    42817,
    42818,
    42819,
    42820,
    42821,
    42822,
    42823,
    42824,
    42825,
    42826,
    42827,
    42828,
    42829,
    42830,
    42831,
    42832,
    42833,
    42834,
    42835,
    42836,
    42837,
    42838,
    42839,
    42840,
    42841,
    42842,
    42843,
    42844,
    42845,
    42846,
    42847,
    42848,
    42849,
    42850,
    42851,
    42852,
    42853,
    42854,
    42855,
    42856,
    42857,
    42858,
    42859,
    42860,
    42861,
    42862,
    42863,
    42864,
    42865,
    42873,
    42874,
    42875,
    42876,
    42877,
    42879,
    42880,
    42881,
    42882,
    42883,
    42884,
    42885,
    42886,
    42887,
    42888,
    42892,
    42893,
    64256,
    64263,
    64275,
    64280,
    65345,
    65371,
    66600,
    66640,
    119834,
    119860,
    119886,
    119893,
    119894,
    119912,
    119938,
    119964,
    119990,
    119994,
    119995,
    119996,
    119997,
    120004,
    120005,
    120016,
    120042,
    120068,
    120094,
    120120,
    120146,
    120172,
    120198,
    120224,
    120250,
    120276,
    120302,
    120328,
    120354,
    120380,
    120406,
    120432,
    120458,
    120486,
    120514,
    120539,
    120540,
    120546,
    120572,
    120597,
    120598,
    120604,
    120630,
    120655,
    120656,
    120662,
    120688,
    120713,
    120714,
    120720,
    120746,
    120771,
    120772,
    120778,
    120779,
    120780
  ],
  "So": [
    166,
    168,
    169,
    170,
    174,
    175,
    176,
    177,
    182,
    183,
    1154,
    1155,
    1550,
    1552,
    1769,
    1770,
    1789,
    1791,
    2038,
    2039,
    2554,
    2555,
    2928,
    2929,
    3059,
    3065,
    3066,
    3067,
    3199,
    3200,
    3313,
    3315,
    3449,
    3450,
    3841,
    3844,
    3859,
    3864,
    3866,
    3872,
    3892,
    3893,
    3894,
    3895,
    3896,
    3897,
    4030,
    4038,
    4039,
    4045,
    4046,
    4048,
    4053,
    4057,
    4254,
    4256,
    4960,
    4961,
    5008,
    5018,
    6464,
    6465,
    6624,
    6656,
    7009,
    7019,
    7028,
    7037,
    8448,
    8450,
    8451,
    8455,
    8456,
    8458,
    8468,
    8469,
    8470,
    8473,
    8478,
    8484,
    8485,
    8486,
    8487,
    8488,
    8489,
    8490,
    8494,
    8495,
    8506,
    8508,
    8522,
    8523,
    8524,
    8526,
    8527,
    8528,
    8597,
    8602,
    8604,
    8608,
    8609,
    8611,
    8612,
    8614,
    8615,
    8622,
    8623,
    8654,
    8656,
    8658,
    8659,
    8660,
    8661,
    8692,
    8960,
    8968,
    8972,
    8992,
    8994,
    9001,
    9003,
    9084,
    9085,
    9115,
    9140,
    9180,
    9186,
    9193,
    9216,
    9255,
    9280,
    9291,
    9372,
    9450,
    9472,
    9655,
    9656,
    9665,
    9666,
    9720,
    9728,
    9839,
    9840,
    9934,
    9935,
    9954,
    9955,
    9956,
    9960,
    9984,
    9985,
    9989,
    9990,
    9994,
    9996,
    10024,
    10025,
    10060,
    10061,
    10062,
    10063,
    10067,
    10070,
    10079,
    10081,
    10088,
    10132,
    10133,
    10136,
    10160,
    10161,
    10175,
    10240,
    10496,
    11008,
    11056,
    11077,
    11079,
    11088,
    11098,
    11493,
    11499,
    11904,
    11930,
    11931,
    12020,
    12032,
    12246,
    12272,
    12284,
    12292,
    12293,
    12306,
    12308,
    12320,
    12321,
    12342,
    12344,
    12350,
    12352,
    12688,
    12690,
    12694,
    12704,
    12736,
    12772,
    12800,
    12831,
    12842,
    12881,
    12896,
    12928,
    12938,
    12977,
    12992,
    13055,
    13056,
    13312,
    19904,
    19968,
    42128,
    42183,
    43048,
    43052,
    43062,
    43064,
    43065,
    43066,
    43639,
    43642,
    65021,
    65022,
    65508,
    65509,
    65512,
    65513,
    65517,
    65519,
    65532,
    65534,
    65794,
    65795,
    65847,
    65856,
    65913,
    65930,
    65936,
    65948,
    66000,
    66045,
    118784,
    119030,
    119040,
    119079,
    119081,
    119141,
    119146,
    119149,
    119171,
    119173,
    119180,
    119210,
    119214,
    119262,
    119296,
    119362,
    119365,
    119366,
    119552,
    119639,
    126976,
    127020,
    127024,
    127124,
    127248,
    127279,
    127281,
    127282,
    127293,
    127294,
    127295,
    127296,
    127298,
    127299,
    127302,
    127303,
    127306,
    127311,
    127319,
    127320,
    127327,
    127328,
    127353,
    127354,
    127355,
    127357,
    127359,
    127360,
    127370,
    127374,
    127376,
    127377,
    127488,
    127489,
    127504,
    127538,
    127552,
    127561
  ],
  "Pi": [
    171,
    172,
    8216,
    8217,
    8219,
    8221,
    8223,
    8224,
    8249,
    8250,
    11778,
    11779,
    11780,
    11781,
    11785,
    11786,
    11788,
    11789,
    11804,
    11805,
    11808,
    11809
  ],
  "Cf": [
    173,
    174,
    1536,
    1540,
    1757,
    1758,
    1807,
    1808,
    6068,
    6070,
    8203,
    8208,
    8234,
    8239,
    8288,
    8293,
    8298,
    8304,
    65279,
    65280,
    65529,
    65532,
    69821,
    69822,
    119155,
    119163,
    917505,
    917506,
    917536,
    917632
  ],
  "No": [
    178,
    180,
    185,
    186,
    188,
    191,
    2548,
    2554,
    3056,
    3059,
    3192,
    3199,
    3440,
    3446,
    3882,
    3892,
    4969,
    4989,
    6128,
    6138,
    8304,
    8305,
    8308,
    8314,
    8320,
    8330,
    8528,
    8544,
    8585,
    8586,
    9312,
    9372,
    9450,
    9472,
    10102,
    10132,
    11517,
    11518,
    12690,
    12694,
    12832,
    12842,
    12881,
    12896,
    12928,
    12938,
    12977,
    12992,
    43056,
    43062,
    65799,
    65844,
    65909,
    65913,
    65930,
    65931,
    66336,
    66340,
    67672,
    67680,
    67862,
    67868,
    68160,
    68168,
    68221,
    68223,
    68440,
    68448,
    68472,
    68480,
    69216,
    69247,
    119648,
    119666,
    127232,
    127243
  ],
  "Pf": [
    187,
    188,
    8217,
    8218,
    8221,
    8222,
    8250,
    8251,
    11779,
    11780,
    11781,
    11782,
    11786,
    11787,
    11789,
    11790,
    11805,
    11806,
    11809,
    11810
  ],
  "Lo": [
    443,
    444,
    448,
    452,
    660,
    661,
    1488,
    1515,
    1520,
    1523,
    1569,
    1600,
    1601,
    1611,
    1646,
    1648,
    1649,
    1748,
    1749,
    1750,
    1774,
    1776,
    1786,
    1789,
    1791,
    1792,
    1808,
    1809,
    1810,
    1840,
    1869,
    1958,
    1969,
    1970,
    1994,
    2027,
    2048,
    2070,
    2308,
    2362,
    2365,
    2366,
    2384,
    2385,
    2392,
    2402,
    2418,
    2419,
    2425,
    2432,
    2437,
    2445,
    2447,
    2449,
    2451,
    2473,
    2474,
    2481,
    2482,
    2483,
    2486,
    2490,
    2493,
    2494,
    2510,
    2511,
    2524,
    2526,
    2527,
    2530,
    2544,
    2546,
    2565,
    2571,
    2575,
    2577,
    2579,
    2601,
    2602,
    2609,
    2610,
    2612,
    2613,
    2615,
    2616,
    2618,
    2649,
    2653,
    2654,
    2655,
    2674,
    2677,
    2693,
    2702,
    2703,
    2706,
    2707,
    2729,
    2730,
    2737,
    2738,
    2740,
    2741,
    2746,
    2749,
    2750,
    2768,
    2769,
    2784,
    2786,
    2821,
    2829,
    2831,
    2833,
    2835,
    2857,
    2858,
    2865,
    2866,
    2868,
    2869,
    2874,
    2877,
    2878,
    2908,
    2910,
    2911,
    2914,
    2929,
    2930,
    2947,
    2948,
    2949,
    2955,
    2958,
    2961,
    2962,
    2966,
    2969,
    2971,
    2972,
    2973,
    2974,
    2976,
    2979,
    2981,
    2984,
    2987,
    2990,
    3002,
    3024,
    3025,
    3077,
    3085,
    3086,
    3089,
    3090,
    3113,
    3114,
    3124,
    3125,
    3130,
    3133,
    3134,
    3160,
    3162,
    3168,
    3170,
    3205,
    3213,
    3214,
    3217,
    3218,
    3241,
    3242,
    3252,
    3253,
    3258,
    3261,
    3262,
    3294,
    3295,
    3296,
    3298,
    3333,
    3341,
    3342,
    3345,
    3346,
    3369,
    3370,
    3386,
    3389,
    3390,
    3424,
    3426,
    3450,
    3456,
    3461,
    3479,
    3482,
    3506,
    3507,
    3516,
    3517,
    3518,
    3520,
    3527,
    3585,
    3633,
    3634,
    3636,
    3648,
    3654,
    3713,
    3715,
    3716,
    3717,
    3719,
    3721,
    3722,
    3723,
    3725,
    3726,
    3732,
    3736,
    3737,
    3744,
    3745,
    3748,
    3749,
    3750,
    3751,
    3752,
    3754,
    3756,
    3757,
    3761,
    3762,
    3764,
    3773,
    3774,
    3776,
    3781,
    3804,
    3806,
    3840,
    3841,
    3904,
    3912,
    3913,
    3949,
    3976,
    3980,
    4096,
    4139,
    4159,
    4160,
    4176,
    4182,
    4186,
    4190,
    4193,
    4194,
    4197,
    4199,
    4206,
    4209,
    4213,
    4226,
    4238,
    4239,
    4304,
    4347,
    4352,
    4681,
    4682,
    4686,
    4688,
    4695,
    4696,
    4697,
    4698,
    4702,
    4704,
    4745,
    4746,
    4750,
    4752,
    4785,
    4786,
    4790,
    4792,
    4799,
    4800,
    4801,
    4802,
    4806,
    4808,
    4823,
    4824,
    4881,
    4882,
    4886,
    4888,
    4955,
    4992,
    5008,
    5024,
    5109,
    5121,
    5741,
    5743,
    5760,
    5761,
    5787,
    5792,
    5867,
    5888,
    5901,
    5902,
    5906,
    5920,
    5938,
    5952,
    5970,
    5984,
    5997,
    5998,
    6001,
    6016,
    6068,
    6108,
    6109,
    6176,
    6211,
    6212,
    6264,
    6272,
    6313,
    6314,
    6315,
    6320,
    6390,
    6400,
    6429,
    6480,
    6510,
    6512,
    6517,
    6528,
    6572,
    6593,
    6600,
    6656,
    6679,
    6688,
    6741,
    6917,
    6964,
    6981,
    6988,
    7043,
    7073,
    7086,
    7088,
    7168,
    7204,
    7245,
    7248,
    7258,
    7288,
    7401,
    7405,
    7406,
    7410,
    8501,
    8505,
    11568,
    11622,
    11648,
    11671,
    11680,
    11687,
    11688,
    11695,
    11696,
    11703,
    11704,
    11711,
    11712,
    11719,
    11720,
    11727,
    11728,
    11735,
    11736,
    11743,
    12294,
    12295,
    12348,
    12349,
    12353,
    12439,
    12447,
    12448,
    12449,
    12539,
    12543,
    12544,
    12549,
    12590,
    12593,
    12687,
    12704,
    12728,
    12784,
    12800,
    13312,
    19894,
    19968,
    40908,
    40960,
    40981,
    40982,
    42125,
    42192,
    42232,
    42240,
    42508,
    42512,
    42528,
    42538,
    42540,
    42606,
    42607,
    42656,
    42726,
    43003,
    43010,
    43011,
    43014,
    43015,
    43019,
    43020,
    43043,
    43072,
    43124,
    43138,
    43188,
    43250,
    43256,
    43259,
    43260,
    43274,
    43302,
    43312,
    43335,
    43360,
    43389,
    43396,
    43443,
    43520,
    43561,
    43584,
    43587,
    43588,
    43596,
    43616,
    43632,
    43633,
    43639,
    43642,
    43643,
    43648,
    43696,
    43697,
    43698,
    43701,
    43703,
    43705,
    43710,
    43712,
    43713,
    43714,
    43715,
    43739,
    43741,
    43968,
    44003,
    44032,
    55204,
    55216,
    55239,
    55243,
    55292,
    63744,
    64046,
    64048,
    64110,
    64112,
    64218,
    64285,
    64286,
    64287,
    64297,
    64298,
    64311,
    64312,
    64317,
    64318,
    64319,
    64320,
    64322,
    64323,
    64325,
    64326,
    64434,
    64467,
    64830,
    64848,
    64912,
    64914,
    64968,
    65008,
    65020,
    65136,
    65141,
    65142,
    65277,
    65382,
    65392,
    65393,
    65438,
    65440,
    65471,
    65474,
    65480,
    65482,
    65488,
    65490,
    65496,
    65498,
    65501,
    65536,
    65548,
    65549,
    65575,
    65576,
    65595,
    65596,
    65598,
    65599,
    65614,
    65616,
    65630,
    65664,
    65787,
    66176,
    66205,
    66208,
    66257,
    66304,
    66335,
    66352,
    66369,
    66370,
    66378,
    66432,
    66462,
    66464,
    66500,
    66504,
    66512,
    66640,
    66718,
    67584,
    67590,
    67592,
    67593,
    67594,
    67638,
    67639,
    67641,
    67644,
    67645,
    67647,
    67670,
    67840,
    67862,
    67872,
    67898,
    68096,
    68097,
    68112,
    68116,
    68117,
    68120,
    68121,
    68148,
    68192,
    68221,
    68352,
    68406,
    68416,
    68438,
    68448,
    68467,
    68608,
    68681,
    69763,
    69808,
    73728,
    74607,
    77824,
    78895,
    131072,
    173783,
    173824,
    177973,
    194560,
    195102
  ],
  "Lt": [
    453,
    454,
    456,
    457,
    459,
    460,
    498,
    499,
    8072,
    8080,
    8088,
    8096,
    8104,
    8112,
    8124,
    8125,
    8140,
    8141,
    8188,
    8189
  ],
  "Lm": [
    688,
    706,
    710,
    722,
    736,
    741,
    748,
    749,
    750,
    751,
    884,
    885,
    890,
    891,
    1369,
    1370,
    1600,
    1601,
    1765,
    1767,
    2036,
    2038,
    2042,
    2043,
    2074,
    2075,
    2084,
    2085,
    2088,
    2089,
    2417,
    2418,
    3654,
    3655,
    3782,
    3783,
    4348,
    4349,
    6103,
    6104,
    6211,
    6212,
    6823,
    6824,
    7288,
    7294,
    7468,
    7522,
    7544,
    7545,
    7579,
    7616,
    8305,
    8306,
    8319,
    8320,
    8336,
    8341,
    11389,
    11390,
    11631,
    11632,
    11823,
    11824,
    12293,
    12294,
    12337,
    12342,
    12347,
    12348,
    12445,
    12447,
    12540,
    12543,
    40981,
    40982,
    42232,
    42238,
    42508,
    42509,
    42623,
    42624,
    42775,
    42784,
    42864,
    42865,
    42888,
    42889,
    43471,
    43472,
    43632,
    43633,
    43741,
    43742,
    65392,
    65393,
    65438,
    65440
  ],
  "Mn": [
    768,
    880,
    1155,
    1160,
    1425,
    1470,
    1471,
    1472,
    1473,
    1475,
    1476,
    1478,
    1479,
    1480,
    1552,
    1563,
    1611,
    1631,
    1648,
    1649,
    1750,
    1757,
    1759,
    1765,
    1767,
    1769,
    1770,
    1774,
    1809,
    1810,
    1840,
    1867,
    1958,
    1969,
    2027,
    2036,
    2070,
    2074,
    2075,
    2084,
    2085,
    2088,
    2089,
    2094,
    2304,
    2307,
    2364,
    2365,
    2369,
    2377,
    2381,
    2382,
    2385,
    2390,
    2402,
    2404,
    2433,
    2434,
    2492,
    2493,
    2497,
    2501,
    2509,
    2510,
    2530,
    2532,
    2561,
    2563,
    2620,
    2621,
    2625,
    2627,
    2631,
    2633,
    2635,
    2638,
    2641,
    2642,
    2672,
    2674,
    2677,
    2678,
    2689,
    2691,
    2748,
    2749,
    2753,
    2758,
    2759,
    2761,
    2765,
    2766,
    2786,
    2788,
    2817,
    2818,
    2876,
    2877,
    2879,
    2880,
    2881,
    2885,
    2893,
    2894,
    2902,
    2903,
    2914,
    2916,
    2946,
    2947,
    3008,
    3009,
    3021,
    3022,
    3134,
    3137,
    3142,
    3145,
    3146,
    3150,
    3157,
    3159,
    3170,
    3172,
    3260,
    3261,
    3263,
    3264,
    3270,
    3271,
    3276,
    3278,
    3298,
    3300,
    3393,
    3397,
    3405,
    3406,
    3426,
    3428,
    3530,
    3531,
    3538,
    3541,
    3542,
    3543,
    3633,
    3634,
    3636,
    3643,
    3655,
    3663,
    3761,
    3762,
    3764,
    3770,
    3771,
    3773,
    3784,
    3790,
    3864,
    3866,
    3893,
    3894,
    3895,
    3896,
    3897,
    3898,
    3953,
    3967,
    3968,
    3973,
    3974,
    3976,
    3984,
    3992,
    3993,
    4029,
    4038,
    4039,
    4141,
    4145,
    4146,
    4152,
    4153,
    4155,
    4157,
    4159,
    4184,
    4186,
    4190,
    4193,
    4209,
    4213,
    4226,
    4227,
    4229,
    4231,
    4237,
    4238,
    4253,
    4254,
    4959,
    4960,
    5906,
    5909,
    5938,
    5941,
    5970,
    5972,
    6002,
    6004,
    6071,
    6078,
    6086,
    6087,
    6089,
    6100,
    6109,
    6110,
    6155,
    6158,
    6313,
    6314,
    6432,
    6435,
    6439,
    6441,
    6450,
    6451,
    6457,
    6460,
    6679,
    6681,
    6742,
    6743,
    6744,
    6751,
    6752,
    6753,
    6754,
    6755,
    6757,
    6765,
    6771,
    6781,
    6783,
    6784,
    6912,
    6916,
    6964,
    6965,
    6966,
    6971,
    6972,
    6973,
    6978,
    6979,
    7019,
    7028,
    7040,
    7042,
    7074,
    7078,
    7080,
    7082,
    7212,
    7220,
    7222,
    7224,
    7376,
    7379,
    7380,
    7393,
    7394,
    7401,
    7405,
    7406,
    7616,
    7655,
    7677,
    7680,
    8400,
    8413,
    8417,
    8418,
    8421,
    8433,
    11503,
    11506,
    11744,
    11776,
    12330,
    12336,
    12441,
    12443,
    42607,
    42608,
    42620,
    42622,
    42736,
    42738,
    43010,
    43011,
    43014,
    43015,
    43019,
    43020,
    43045,
    43047,
    43204,
    43205,
    43232,
    43250,
    43302,
    43310,
    43335,
    43346,
    43392,
    43395,
    43443,
    43444,
    43446,
    43450,
    43452,
    43453,
    43561,
    43567,
    43569,
    43571,
    43573,
    43575,
    43587,
    43588,
    43596,
    43597,
    43696,
    43697,
    43698,
    43701,
    43703,
    43705,
    43710,
    43712,
    43713,
    43714,
    44005,
    44006,
    44008,
    44009,
    44013,
    44014,
    64286,
    64287,
    65024,
    65040,
    65056,
    65063,
    66045,
    66046,
    68097,
    68100,
    68101,
    68103,
    68108,
    68112,
    68152,
    68155,
    68159,
    68160,
    69760,
    69762,
    69811,
    69815,
    69817,
    69819,
    119143,
    119146,
    119163,
    119171,
    119173,
    119180,
    119210,
    119214,
    119362,
    119365,
    917760,
    918000
  ],
  "Me": [
    1160,
    1162,
    1758,
    1759,
    8413,
    8417,
    8418,
    8421,
    42608,
    42611
  ],
  "Mc": [
    2307,
    2308,
    2366,
    2369,
    2377,
    2381,
    2382,
    2383,
    2434,
    2436,
    2494,
    2497,
    2503,
    2505,
    2507,
    2509,
    2519,
    2520,
    2563,
    2564,
    2622,
    2625,
    2691,
    2692,
    2750,
    2753,
    2761,
    2762,
    2763,
    2765,
    2818,
    2820,
    2878,
    2879,
    2880,
    2881,
    2887,
    2889,
    2891,
    2893,
    2903,
    2904,
    3006,
    3008,
    3009,
    3011,
    3014,
    3017,
    3018,
    3021,
    3031,
    3032,
    3073,
    3076,
    3137,
    3141,
    3202,
    3204,
    3262,
    3263,
    3264,
    3269,
    3271,
    3273,
    3274,
    3276,
    3285,
    3287,
    3330,
    3332,
    3390,
    3393,
    3398,
    3401,
    3402,
    3405,
    3415,
    3416,
    3458,
    3460,
    3535,
    3538,
    3544,
    3552,
    3570,
    3572,
    3902,
    3904,
    3967,
    3968,
    4139,
    4141,
    4145,
    4146,
    4152,
    4153,
    4155,
    4157,
    4182,
    4184,
    4194,
    4197,
    4199,
    4206,
    4227,
    4229,
    4231,
    4237,
    4239,
    4240,
    4250,
    4253,
    6070,
    6071,
    6078,
    6086,
    6087,
    6089,
    6435,
    6439,
    6441,
    6444,
    6448,
    6450,
    6451,
    6457,
    6576,
    6593,
    6600,
    6602,
    6681,
    6684,
    6741,
    6742,
    6743,
    6744,
    6753,
    6754,
    6755,
    6757,
    6765,
    6771,
    6916,
    6917,
    6965,
    6966,
    6971,
    6972,
    6973,
    6978,
    6979,
    6981,
    7042,
    7043,
    7073,
    7074,
    7078,
    7080,
    7082,
    7083,
    7204,
    7212,
    7220,
    7222,
    7393,
    7394,
    7410,
    7411,
    43043,
    43045,
    43047,
    43048,
    43136,
    43138,
    43188,
    43204,
    43346,
    43348,
    43395,
    43396,
    43444,
    43446,
    43450,
    43452,
    43453,
    43457,
    43567,
    43569,
    43571,
    43573,
    43597,
    43598,
    43643,
    43644,
    44003,
    44005,
    44006,
    44008,
    44009,
    44011,
    44012,
    44013,
    69762,
    69763,
    69808,
    69811,
    69815,
    69817,
    119141,
    119143,
    119149,
    119155
  ],
  "Nl": [
    5870,
    5873,
    8544,
    8579,
    8581,
    8585,
    12295,
    12296,
    12321,
    12330,
    12344,
    12347,
    42726,
    42736,
    65856,
    65909,
    66369,
    66370,
    66378,
    66379,
    66513,
    66518,
    74752,
    74851
  ],
  "Zl": [
    8232,
    8233
  ],
  "Zp": [
    8233,
    8234
  ],
  "Cs": [
    55296,
    57344
  ],
  "Co": [
    57344,
    63744,
    983040,
    1048574,
    1048576,
    1114110
  ]
};

/* O(1) */

var nil=[]
var universe=[0]

/* fromChar, fromInt */
function fromChar(c){return fromInt(codepointFromChar(c))}
function fromInt(cp){return [cp,cp+1]}

/* from(Int|Char)Range */
function fromIntRange(from,to){return [from,to+1]}
function fromCharRange(from,to){
 from=codepointFromChar(from);to=codepointFromChar(to)
 return to>from ?[from,to+1] :[to,from+1]}

/* tests */
function empty(cset){return !cset.length}
function singleton(cset){return cset.length==2 && cset[0]+1 == cset[1]}

/* a single Unicode code point, from a character which may be represented by one or two UTF-16 code units. */
function codepointFromChar(s){var hi,lo
 if(/[\uD800-\uDBFF][\uDC00-\uDFFF]/.test(s)){
  hi=s.charCodeAt(0)
  lo=s.charCodeAt(1)
  return 0x10000+(((hi&0x3FF) << 10) | (lo&0x3FF))}
 return s.charCodeAt(0)}

/* Set complement, equivalent to difference(universe,cset) but in constant time. */
function complement(cset){
 return (cset[0]==0) ? cset.slice(1)
                     : [0].concat(cset.slice())}

/* O(n) */

/* From an ascending list of distinct integers, each of which is a code point to include in the set. */
function fromList(a){var i,l,ret=[]
 for(i=0,l=a.length;i<l;){
  ret.push(a[i])
  while(a[i]+1 == a[++i] && i<l){};
  if(a[i-1]!==0x10ffff)ret.push(a[i-1]+1)}
 return ret}

/* To a list of ascending integers, each of which is a code point included in the set. */
function toList(cset){var i,l,state=false,ret=[]
 for(i=0,l=cset.length;i<l;i++){
  if(state)fill(cset[i-1],cset[i])
  state=!state}
 if(state)fill(cset[i-1],0x10FFFF)
 return ret
 function fill(a,b){
  for(;a<b;a++)ret.push(a)}}

/* from a string which may contain any Unicode characters in any order and may contain duplicates to the set of distinct characters appearing in the string. */
function fromString(s){var res=[]
 // here using replace as an iterator over Unicode characters
 s.replace(/[\u0000-\uD7FF\uDC00-\uFFFF]|([\uD800-\uDBFF][\uDC00-\uDFFF])|[\uD800-\uDBFF]/g,
  function(m,u){
   if(u)res.push(codepointFromChar(u))
   else res.push(m[0].charCodeAt(0))})
 return fromList(res.sort(function(a,b){return a-b}).filter(function(c,i,a){return !i||a[i-1]!=a[i]}))}

/* test membership of a codepoint c */
function member(cset,c){var state=false,i,l
 if(c>0x10FFFF)return false
 for(i=0,l=cset.length;i<l;i++){
  if(cset[i]>c)return state
  state=!state}
 return state}

/* O(n+m), where n and m are the number of transitions, i.e. the length of the cset array representation rather than the cardinality of the represented set. */

/* equality */
function equal(as,bs){var i,l
 l=as.length
 if(l!=bs.length)return false
 for(i=0;i<l;i++)if(as[i]!=bs[i])return false
 return true}

/* set difference */
function difference(as,bs){var
 ret=[],i=0,j=0,a,b,al=as.length,bl=bs.length,last,state=0
 if(!al)return []
 if(!bl)return as
 a=as[0]
 b=bs[0]
 if(isNaN(a)||isNaN(b))throw Error('cset_difference: bad input')
 for(;;){
  if(a < b){
   if(!(state & 1)){
    if(a==last) ret.pop(); else ret.push(a)
    last=a}
   state ^= 2
   a=(++i<al)?as[i]:0x110000}
  else{
   if(a==0x110000 && b==0x110000) return ret
   if(state & 2){
    if(b==last) ret.pop(); else ret.push(b)
    last=b}
   state ^= 1
   b=(++j<bl)?bs[j]:0x110000}}}

function union(as,bs){var
 ret=[],i=0,j=0,a,b,al=as.length,bl=bs.length,last,state=0
 if(!al)return bs
 if(!bl)return as
 a=as[0]
 b=bs[0]
 if(isNaN(a)||isNaN(b))throw Error('cset_union: bad input')
 for(;;){
  if(a < b){
   if(!(state & 1)){
    if(a==last) ret.pop(); else ret.push(a)
    last=a}
   state ^= 2
   a=(++i<al)?as[i]:0x110000}
  else{
   if(a==0x110000 && b==0x110000) return ret
   if(!(state & 2)){
    if(b==last) ret.pop(); else ret.push(b)
    last=b}
   state ^= 1
   b=(++j<bl)?bs[j]:0x110000}}}

/* set intersection implemented as the complement of the union of the complements. */
function intersection(as,bs){return complement(union(complement(as),complement(bs)))}

/* Any character which matches the SourceCharacter production of ECMA-262, except line terminators, ']', '-', '\', horizontal and vertical tab (0x09 and 0x0B), and form feed 0x0C, and most whitespace, may appear as itself in a regular expression character class. */

esc.safe=[32,33]; //ASCII space is special-cased in even if we exclude the rest of Zs
 ['Lu'
 ,'Ll'
 ,'Lt'
 ,'Lm'
 ,'Lo'
 ,'Nd'
 ,'No'
 ,'Pc'
 ,'Pd'
 ,'Ps'
 ,'Pe'
 ,'Pi'
 ,'Pf'
 ,'Po'
 ,'Sm'
 ,'Sc'
 ,'Sk'
 ,'So'
 //,'Zs' // XXX some of these are fine, but may be confusing
 ].forEach(function(s){esc.safe=union(esc.safe,cset_unicode_categories[s])})
 esc.safe=intersection(esc.safe,fromIntRange(0,0xFFFF))

function esc(n){var
 x={9:'\\t',10:'\\n',11:'\\v',12:'\\f',13:'\\r',45:'\\-',92:'\\\\',93:'\\]'}[n] //single backslash escapes
 if(x)return x
 if(member(esc.safe,n))return String.fromCharCode(n)
 function fill(s){return ('000'+s).slice(-4)}
 return "\\u"+fill(n.toString(16))}

/* TODO we should at some point have output which does not use a character class when not necessary, for example which outputs 'a' rather than '[a]' for a cset containing only the letter a.  At that point we will need another, slightly different, set of safe characters for non-character-class regex literal contexts.  This set would not need to exclude characters outside the BMP or ']', but would exclude '/' and '['. */

/* Convert a set of BMP code points to an ECMAScript-compatible regex character class of the form [ranges], where ranges use literal Unicode characters where they are safe, single-character backslash escapes like "\n" where they exist, and \uHHHH escapes otherwise. */

function reCC_bmp(cset){var res=[],state=0,i,l,c
 if(singleton(cset)) return esc(cset[0])
 for(i=0,l=cset.length;i<l&&cset[i]<0x10000;i++){
  if(state && cset[i] == c+1){state=0;continue}
  c=cset[i]
  if(state){res.push('-');c--}
  res.push(esc(c))
  state=!state}
 if(state){res.push('-\\uffff')}
 return '['+res.join('')+']'}

/* We have code points in the BMP, which can be expressed as \uxxxx, and others, > 0xFFFF, which must be matched as two successive UTF-16 code units. */

/* Our output is either a character class consisting wholly of code points within the BMP (i.e. below 0x10000), or it is an alternation between one or more alternatives each of which matches either one or two code units.  Code points above 0xFFFF (i.e. supplementary code points, those which are not in the BMP) are matched by matching a high surrogate followed by a low surrogate.  Alternatives that are intended to match supplementary code points are a sequence of either a single high surrogate or a range of high surrogates followed by a single low surrogate or a range of low surrogates. */

/* We may be matching a range of Unicode code points that overlaps the high or low surrogate ranges.  We may even be simultaneously matching individual high or low surrogates while also matching supplementary codepoints that will be represented by a surrogate pair.  In this case we must test for the surrogate pairs before testing for surrogates occurring alone.  In general however, we would like to test against the BMP ranges first to improve performance for the most commonly matched ranges.  So what we return is a regex which first tries to match code units in the BMP but outside the surrogate ranges, then tries to match surrogate pairs, and finally tries single surrogate code units if any are to be matched.  Any of these three sets may be empty.  If no surrogate pairs are to be matched, we may unify any matched surrogate and non-surrogate ranges.  As an example, to match any single code unit, we would want the output "[\u0000-\uffff]".  In general, we may so unify any surrogate ranges which do not overlap high surrogates that are part of surrogate pairs to be matched.  This means any low surrogates which are to be matched directly may be included in the range of BMP code points which comprises the first alternative of our output. */

/* To summarize, then, we return an optional initial character class matching any BMP code points that are not high surrogates of code points in the input cset, followed by zero or more alternatives each of which is a sequence of one high surrogate or a range of high surrogates followed by one low surrogate or a range of low surrogates. */

/* First we split the cset into a set of BMP code points and a set of supplementary code points.  We then calculate a set of high surrogates which covers the supplementary code points, and, for each high surrogate in this set, a set of low surrogates which may follow it.  We then take the difference of the set of BMP code points minus the high surrogate set.  If this result set is not empty, we output a character class which covers this range.  We then output the alternatives for surrogate pairs.  If the the full range of two or more high surrogates may be matched (that is, if any low surrogate may follow any of them), then we combine those high surrogates into a character class.  We output each high surrogate or high surrogate character class, followed by a character class of the low surrogates which may follow it.  Finally we output an alternative for the code points in the high surrogate range which may appear alone and which did not already appear in the first part of our output, viz the initial character class covering the BMP range. */

/* This algorithm described above can be followed in the toRegex function, which is preceded below by other helper functions. */

/* This simply splits a cset into two, the subset within the BMP and one for the supplementary subset. */
function splitAtBMP(cset){var bmp=[],i=0,l=cset.length,c,state
 for(;i<l;i++){
  c=cset[i]
  if(c>0xFFFF){
   state=i&1
   if(state)bmp.push(0x10000)
   if(state&&c===0x10000){i++;state=0}
   return [bmp
          ,(state?[0x10000]:[]).concat(cset.slice(i))]}
  bmp.push(c)}
 state=l&1
 if(state)bmp.push(0x10000)
 return [bmp
        ,(state?[0x10000]:[])]}

/* Calculate a surrogate pair from a code point > 0x10000. */
function surrogatePair(n){
 n-=0x10000
 return [0xD800|(n>>10),0xDC00|(n&0x3FF)]}

/* Calculate a surrogate set, which is a set of high surrogates, and, for each, a set of low surrogates.  This is stored as an array of cset pairs, which are arrays in which the first element is a cset of high surrogates and the second is a cset of low surrogates which may follow any one of them. */

/* We also return a cset of all high surrogates to save recalculating this from the primary output. */

/* This function was written all at one go and passed every test.  If it is later found to contain a bug, the author suggests starting over. */

function surrogateSet(cset){var i=0,l=cset.length,state,c,prev,hi,lo,ret=[],prev_hi,prev_lo,full=[],cur,all_hi=[],a
 if(l&1){cset[l++]=0x110000} //normalize
 cset.push(0x110001) //causes the last 'cur' to be pushed
 for(;c=cset[i];i++){
  if(c<0x10000)continue
  state=i&1
  if(state){
   a=surrogatePair(c);hi=a[0];lo=a[1]
   if(!cur){prev_hi=0xD800;prev_lo=0xDC00;cur=[[0xD800,0xD801],[0xDC00]]}
   if(hi===prev_hi) cur[1].push(lo)
   else{
    if(prev_lo===0xDC00){full.push(prev_hi);all_hi.push(prev_hi)}
    else{cur[1].push(0xE000);ret.push(cur);all_hi.push(prev_hi)}
    while(++prev_hi < hi){full.push(prev_hi);all_hi.push(prev_hi)}
    if(lo===0xDC00) cur=[[hi,hi+1],[]]
    else cur=[[hi,hi+1],[0xDC00,lo]]}
   prev_lo=lo}
  else{
   a=surrogatePair(c);hi=a[0];lo=a[1]
   if(cur && hi===prev_hi) cur[1].push(lo)
   else{
    if(cur && cur[1].length){ret.push(cur);all_hi.push(prev_hi)}
    prev_hi=hi
    cur=[[hi,hi+1],[lo]]}
   prev_lo=lo}}
 return [fromList(all_hi)
        ,(full.length?[[fromList(full),[0xDC00,0xE000]]]
                     :[]).concat(ret)
        ]}

/* create an alternative to match a surrogate pair. */
function surrogateSetToRE(surr){var ret=[]
 surr.forEach(function(pair){
  ret.push(f(pair[0])+f(pair[1]))})
 return ret.join('|')
 function f(cset){
  return reCC_bmp(cset)}}

/* toRegex is the main driver for the regex output process. */
function toRegex(cset){var a,bmp,sup,all_hi,surr,d,i,ret=[]
 a=splitAtBMP(cset);bmp=a[0];sup=a[1] // poor man's destructuring assignment
 a=surrogateSet(sup);all_hi=a[0];surr=a[1]
 d=difference(bmp,all_hi)
 i=intersection(bmp,all_hi)
 if(!empty(d)) ret.push(reCC_bmp(d))
 if(surr.length) ret.push(surrogateSetToRE(surr))
 if(!empty(i)) ret.push(reCC_bmp(i))
 return ret.join('|')}

/* toSurrogateRepresentation is similar to toRegex but returns an intermediate form (e.g. for constructing a DFA).  toRegex above could be implemented externally in terms of this.  This is for UTF-16 but a UTF-8 version should be added too.  Possibly all of this should be moved into a separate module. */
function toSurrogateRepresentation(cset){var a,bmp,sup,all_hi,surr,d,i
 a=splitAtBMP(cset);bmp=a[0];sup=a[1]
 a=surrogateSet(sup);all_hi=a[0];surr=a[1]
 return {bmp:bmp,surrogate_range_pairs:surr,high_surrogates:all_hi}}

/* return a cset from a Unicode General Category. */
function fromUnicodeGeneralCategory(x){
 var ret=cset_unicode_categories[x]
 if(!ret) throw Error('unknown Unicode General Category '+x)
 return ret}

/* This is useful for debugging */
function show(cset){var i,l,ret=[],c
 if(cset.length % 2) cset.push(0x110000)
 for(i=0,l=cset.length;i<l;i+=2){
  c=cset[i]
  if(cset[i+1]==c+1)ret.push(c.toString(16))
  else ret.push(c.toString(16)+'-'+(cset[i+1]-1).toString(16))}
 return ret.join('\n')}

var i,e,es=
[['fromChar',fromChar] //exports
,['fromInt',fromInt]
,['universe',universe]
,['nil',nil]
,['empty',empty]
,['singleton',singleton]
,['fromIntRange',fromIntRange]
,['fromCharRange',fromCharRange]
,['fromUnicodeGeneralCategory',fromUnicodeGeneralCategory]
,['complement',complement]
,['fromList',fromList]
,['toList',toList]
,['fromString',fromString]
,['member',member]
,['equal',equal]
,['difference',difference]
,['union',union]
,['intersection',intersection]
,['toRegex',toRegex]
,['toSurrogateRepresentation',toSurrogateRepresentation]
,['show',show]
]
for(i=0;e=es[i];i++)exports[e[0]]=e[1]

})
(CSET={});



exports.generateParser=generateParser

exports.explain=explain



})(typeof exports=='object'?exports:PanPG={});

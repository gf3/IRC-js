// IRC-js event names and codes
/** @enum {string} */
const EVENT =
  { ANY: "*"
  , CONNECT: "1"
  , DISCONNECT: "2"
  , ERROR: "3"
  }

// Stuff used in Node socket
const SOCKET =
  { CLOSE: "close"
  , CONNECT: "connect"
  , DATA: "data"
  , DRAIN: "drain"
  , END: "end"
  , ERROR: "error"
  , TIMEOUT: "timeout"
  }

// IRC protocol commands and codes
// Generated from data @ http://www.networksorcery.com/enp/protocol/irc.htm
// Additional modes found @ http://freenode.net/using_the_network.shtml
// @todo {jonas} Find/create a definite source, automate generation of code.

/** @enum {string} */
const COMMAND =
  { ADMIN: "ADMIN"
  , AWAY: "AWAY"
  , CONNECT: "CONNECT"
  , DIE: "DIE"
  , ERROR: "ERROR"
  , INFO: "INFO"
  , INVITE: "INVITE"
  , ISON: "ISON"
  , JOIN: "JOIN"
  , KICK: "KICK"
  , KILL: "KILL"
  , LINKS: "LINKS"
  , LIST: "LIST"
  , LUSERS: "LUSERS"
  , MODE: "MODE"
  , MOTD: "MOTD"
  , NAMES: "NAMES"
  , NICK: "NICK"
  , NJOIN: "NJOIN"
  , NOTICE: "NOTICE"
  , OPER: "OPER"
  , PART: "PART"
  , PASS: "PASS"
  , PING: "PING"
  , PONG: "PONG"
  , PRIVMSG: "PRIVMSG"
  , QUIT: "QUIT"
  , REHASH: "REHASH"
  , RESTART: "RESTART"
  , SERVER: "SERVER"
  , SERVICE: "SERVICE"
  , SERVLIST: "SERVLIST"
  , SQUERY: "SQUERY"
  , SQUIRT: "SQUIRT"
  , SQUIT: "SQUIT"
  , STATS: "STATS"
  , SUMMON: "SUMMON"
  , TIME: "TIME"
  , TOPIC: "TOPIC"
  , TRACE: "TRACE"
  , USER: "USER"
  , USERHOST: "USERHOST"
  , USERS: "USERS"
  , VERSION: "VERSION"
  , WALLOPS: "WALLOPS"
  , WHO: "WHO"
  , WHOIS: "WHOIS"
  , WHOWAS: "WHOWAS"
  }

/** @enum {string} */
const REPLY =
  { WELCOME: "001"
  , YOURHOST: "002"
  , CREATED: "003"
  , MYINFO: "004"
  , BOUNCE: "005"
  , TRACELINK: "200"
  , TRACECONNECTING: "201"
  , TRACEHANDSHAKE: "202"
  , TRACEUNKNOWN: "203"
  , TRACEOPERATOR: "204"
  , TRACEUSER: "205"
  , TRACESERVER: "206"
  , TRACESERVICE: "207"
  , TRACENEWTYPE: "208"
  , TRACECLASS: "209"
  , TRACERECONNECT: "210"
  , STATSLINKINFO: "211"
  , STATSCOMMANDS: "212"
  , ENDOFSTATS: "219"
  , UMODEIS: "221"
  , SERVLIST: "234"
  , SERVLISTEND: "235"
  , STATSUPTIME: "242"
  , STATSOLINE: "243"
  , LUSERCLIENT: "251"
  , LUSEROP: "252"
  , LUSERUNKNOWN: "253"
  , LUSERCHANNELS: "254"
  , LUSERME: "255"
  , ADMINME: "256"
  , ADMINLOC1: "257"
  , ADMINLOC2: "258"
  , ADMINEMAIL: "259"
  , TRACELOG: "261"
  , TRACEEND: "262"
  , TRYAGAIN: "263"
  , AWAY: "301"
  , USERHOST: "302"
  , ISON: "303"
  , UNAWAY: "305"
  , NOWAWAY: "306"
  , WHOISUSER: "311"
  , WHOISSERVER: "312"
  , WHOISOPERATOR: "313"
  , WHOWASUSER: "314"
  , ENDOFWHO: "315"
  , WHOISIDLE: "317"
  , ENDOFWHOIS: "318"
  , WHOISCHANNELS: "319"
  , LISTSTART: "321"
  , LIST: "322"
  , LISTEND: "323"
  , CHANNELMODEIS: "324"
  , UNIQOPIS: "325"
  , NOTOPIC: "331"
  , TOPIC: "332"
  // Unsure what this is called, added it manually http://www.mirc.net/raws/?view=333
  // There are tons more there, should maybe use that as source.
  , JOIN: "333"
  , INVITING: "341"
  , SUMMONING: "342"
  , INVITELIST: "346"
  , ENDOFINVITELIST: "347"
  , EXCEPTLIST: "348"
  , ENDOFEXCEPTLIST: "349"
  , VERSION: "351"
  , WHOREPLY: "352"
  , NAMREPLY: "353"
  , LINKS: "364"
  , ENDOFLINKS: "365"
  , ENDOFNAMES: "366"
  , BANLIST: "367"
  , ENDOFBANLIST: "368"
  , ENDOFWHOWAS: "369"
  , INFO: "371"
  , MOTD: "372"
  , ENDOFINFO: "374"
  , MOTDSTART: "375"
  , ENDOFMOTD: "376"
  , YOUREOPER: "381"
  , REHASHING: "382"
  , YOURESERVICE: "383"
  , TIME: "391"
  , USERSSTART: "392"
  , USERS: "393"
  , ENDOFUSERS: "394"
  , NOUSERS: "395"
  }

/** @enum {string} */
const ERROR =
  { NOSUCHNICK: "401"
  , NOSUCHSERVER: "402"
  , NOSUCHCHANNEL: "403"
  , CANNOTSENDTOCHAN: "404"
  , TOOMANYCHANNELS: "405"
  , WASNOSUCHNICK: "406"
  , TOOMANYTARGETS: "407"
  , NOSUCHSERVICE: "408"
  , NOORIGIN: "409"
  , NORECIPIENT: "411"
  , NOTEXTTOSEND: "412"
  , NOTOPLEVEL: "413"
  , WILDTOPLEVEL: "414"
  , BADMASK: "415"
  , UNKNOWNCOMMAND: "421"
  , NOMOTD: "422"
  , NOADMININFO: "423"
  , FILEERROR: "424"
  , NONICKNAMEGIVEN: "431"
  , ERRONEUSNICKNAME: "432"
  , NICKNAMEINUSE: "433"
  , NICKCOLLISION: "436"
  , UNAVAILRESOURCE: "437"
  , USERNOTINCHANNEL: "441"
  , NOTONCHANNEL: "442"
  , USERONCHANNEL: "443"
  , NOLOGIN: "444"
  , SUMMONDISABLED: "445"
  , USERSDISABLED: "446"
  , NOTREGISTERED: "451"
  , NEEDMOREPARAMS: "461"
  , ALREADYREGISTRED: "462"
  , NOPERMFORHOST: "463"
  , PASSWDMISMATCH: "464"
  , YOUREBANNEDCREEP: "465"
  , YOUWILLBEBANNED: "466"
  , KEYSET: "467"
  // 470 Found here http://freenode.net/using_the_network.shtml
  , NOINVITEFORWARD: "470"
  , CHANNELISFULL: "471"
  , UNKNOWNMODE: "472"
  , INVITEONLYCHAN: "473"
  , BANNEDFROMCHAN: "474"
  , BADCHANNELKEY: "475"
  , BADCHANMASK: "476"
  , NOCHANMODES: "477"
  , BANLISTFULL: "478"
  , NOPRIVILEGES: "481"
  , CHANOPRIVSNEEDED: "482"
  , CANTKILLSERVER: "483"
  , RESTRICTED: "484"
  , UNIQOPPRIVSNEEDED: "485"
  , NOOPERHOST: "491"
  , UMODEUNKNOWNFLAG: "501"
  , USERSDONTMATCH: "502"
  }

/** @enum {number|string} */
const CHANMODE =
    { ANONYMOUS: 'a'
    , INVITE: 'i'
    , MODERATED: 'm'
    , NOSPAM: 'n'
    , PRIVATE: 'p'
    , QUIET: 'q'
    , REOP: 'r'
    , SECRET: 's'
    , TOPIC: 't'
    , BANMASK: 'b'
    , CREATOR: 'O'
    , EXCEPTMASK: 'e'
    , INVITEMASK: 'I'
    , KEY: 'k'
    , LIMIT: 'l'
    , OP: 'o'
    , VOICE: 'v'
    }

/** @enum {number|string} */
const USERMODE =
    { AWAY: 'a'
    , DEAF: 'D'
    , CALLERID: 'g'
    , INVISIBLE: 'i'
    , LOCALOP: 'O'
    , OPERATOR: 'o'
    , NOFORWARD: 'Q'
    , BLCKNOIDENT: 'R'
    , RESTRICTED: 'r'
    , SRVNOTICES: 's'
    , WALLOPS: 'w'
    , SECURE: 'Z'
    }

const MODE =
    { CHANNEL: CHANMODE
    , USER: USERMODE
    }

exports.EVENT   = EVENT
exports.COMMAND = COMMAND
exports.ERROR   = ERROR
exports.MODE    = MODE
exports.REPLY   = REPLY
exports.SOCKET  = SOCKET

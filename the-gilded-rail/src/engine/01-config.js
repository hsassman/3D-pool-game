/* The Gilded Rail - CONFIG
   Part of the global-scope engine; loaded in numeric order (see index.html).
   Relies on symbols defined in earlier-numbered files. */

/* ================= CONFIG ================= */
const TABLE = { W: 2.24, H: 1.12, CUSH_H: 0.042, CUSH_D: 0.05, RAIL: 0.135, CORNER_CUT: 0.082, SIDE_CUT: 0.065 };
const BALL  = { R: 0.028575, M: 0.170 };           // regulation 57.15mm / 170g
const PHYS  = { g: 10.6, muSlide: 0.20, muRoll: 0.011, spinDecay: 4.2,
                eBall: 0.95, eCush: 0.80, cushGrip: 0.22, cushSpinKick: 0.52,
                eGround: 0.42, dt: 1/240 };          // eGround: bounce when a jumped ball lands
const MAX_BREAK_SPEED = 9.5;                        // m/s at 100% power
/* level required to unlock each game type (career leagues are gated in 19a-campaign).
   Multiplayer arrives later, so it has no level here - it shows as "coming soon". */
const MODE_LOCKS = { '8ball':1, practice:1, blackball:3, '9ball':6 };
const W2 = TABLE.W/2, H2 = TABLE.H/2, UP = new THREE.Vector3(0,1,0);
let ROOM_CEIL_Y = 2.95;                            // ceiling height; camera can't pass it in free-walk (set in buildTable)
let ROOM_RX = 6.6, ROOM_BZ = -4.27, ROOM_FZ = 5.4, ROOM_FLOOR_Y = -0.815;   // wall bounds for free-cam collision (set in buildTable)
let WALK_BLOCKS = [];   // world AABBs {x0,x1,z0,z1} the first-person eye can't walk through (table, bar, lounge); set in buildTable
const KITCHEN_X = -TABLE.W/4;                       // head string
const FOOT_SPOT = new THREE.Vector3(TABLE.W/4, BALL.R, 0);

const BALL_COLORS = {1:0xf2b021,2:0x1f4fa3,3:0xc23b2e,4:0x5b2d8d,5:0xe07b1f,
                     6:0x1d7a46,7:0x8d2f33,8:0x141414,9:0xf2b021,10:0x1f4fa3,
                     11:0xc23b2e,12:0x5b2d8d,13:0xe07b1f,14:0x1d7a46,15:0x8d2f33};
const DIFFS = [
  {name:'THE REGULAR',   jitter:0.020, powErr:0.11, think:[900,1700], smart:0.68},
  {name:'THE HUSTLER',   jitter:0.0075,powErr:0.045,think:[800,1500], smart:0.90},
  {name:'MIDNIGHT SHARK',jitter:0.0018,powErr:0.012,think:[700,1300], smart:1.0},
];

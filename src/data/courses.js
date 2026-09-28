const T = 'Tutorial', SW = 'Sweepers', TR = 'Trampolines', CR = 'Crankshafts',
CO = 'Conveyors', MX = 'Mix', PL = 'Platforms', BU = 'Bumpers', PE = 'Pendulums',
BB = 'Big Balls';
const VE = 'VeryEasy', E = 'Easy', A = 'Average', H = 'Hard';
export const COURSES = [
{ id: 'S01E01C1', environment: 'Tiki', layout: 25, code: '25107108109110', stars: [15.0, 16.5, 20.3],
chunks: [['107', 'Tutorial01', T, VE], ['108', 'Tutorial02', T, VE], ['109', 'Tutorial03', T, VE], ['110', 'Tutorial04', T, VE]] },
{ id: 'S01E01C2', environment: 'Tiki', layout: 25, code: '25124125132133', stars: [9.8, 12.0, 14.7],
chunks: [['124', 'sweep01', SW, VE], ['125', 'tramp01', TR, VE], ['132', 'crank13', CR, VE], ['133', 'convey12', CO, VE]] },
{ id: 'S01E01C3', environment: 'Tiki', layout: 26, code: '26160152159149171', stars: [9.4, 11.5, 14.0],
chunks: [['160', 'tramp12', TR, VE], ['152', 'mix14', MX, VE], ['159', 'mix17', MX, E], ['149', 'plats13', PL, VE], ['171', 'TutorialBalls', T, VE]] },
{ id: 'S01E02C1', environment: 'Pirate', layout: 7, code: '07119147148136', stars: [9.6, 11.7, 14.4],
chunks: [['119', 'bumper06', BU, VE], ['147', 'sweep27', SW, VE], ['148', 'pendul18', PE, VE], ['136', 'plats08', PL, A]] },
{ id: 'S01E02C2', environment: 'Pirate', layout: 7, code: '07151068138150', stars: [9.6, 11.7, 14.4],
chunks: [['151', 'mix13', MX, VE], ['068', 'plats11', PL, A], ['138', 'bumper17', BU, VE], ['150', 'tramp11', TR, VE]] },
{ id: 'S01E02C3', environment: 'Pirate', layout: 8, code: '08141130087160001', stars: [12.7, 15.5, 19.0],
chunks: [['141', 'pendul17', PE, VE], ['130', 'plats05', PL, VE], ['087', 'convey06', CO, A], ['160', 'tramp12', TR, VE], ['001', 'balls02', BB, A]] },
{ id: 'S01E03C1', environment: 'Medieval', layout: 19, code: '19132140143146', stars: [9.9, 12.2, 14.9],
chunks: [['132', 'crank13', CR, VE], ['140', 'convey13', CO, E], ['143', 'bumper18', BU, VE], ['146', 'mix12', MX, VE]] },
{ id: 'S01E03C2', environment: 'Medieval', layout: 19, code: '19062129052144', stars: [10.0, 12.3, 15.0],
chunks: [['062', 'tramp02', TR, VE], ['129', 'plats04', PL, VE], ['052', 'sweep15', SW, A], ['144', 'convey14', CO, VE]] },
{ id: 'S01E03C3', environment: 'Medieval', layout: 20, code: '20141129124000166', stars: [12.7, 15.5, 19.0],
chunks: [['141', 'pendul17', PE, VE], ['129', 'plats04', PL, VE], ['124', 'sweep01', SW, VE], ['000', 'balls01', BB, A], ['166', 'crank16', CR, E]] },
{ id: 'S02E01C1', environment: 'Fastfood', layout: 13, code: '13075007074001', stars: [10.8, 13.2, 16.2],
chunks: [['075', 'mix01', MX, A], ['007', 'bumper08', BU, E], ['074', 'pendul11', PE, A], ['001', 'balls02', BB, A]] },
{ id: 'S02E01C2', environment: 'Fastfood', layout: 13, code: '13027162126121', stars: [9.9, 12.2, 14.9],
chunks: [['027', 'plats02', PL, E], ['162', 'tramp14', TR, E], ['126', 'tramp09', TR, A], ['121', 'pendul01', PE, E]] },
{ id: 'S02E01C3', environment: 'Fastfood', layout: 14, code: '14132157086060010', stars: [9.9, 12.2, 14.9],
chunks: [['132', 'crank13', CR, VE], ['157', 'mix15', MX, E], ['086', 'bumper02', BU, A], ['060', 'sweep24', SW, A], ['010', 'convey01', CO, A]] },
{ id: 'S02E02C1', environment: 'Forest', layout: 31, code: '31140025001051', stars: [9.1, 11.2, 13.7],
chunks: [['140', 'convey13', CO, E], ['025', 'pendul08', PE, E], ['001', 'balls02', BB, A], ['051', 'sweep14', SW, E]] },
{ id: 'S02E02C2', environment: 'Forest', layout: 31, code: '31013049026060', stars: [7.7, 9.5, 11.6],
chunks: [['013', 'convey04', CO, E], ['049', 'sweep12', SW, A], ['026', 'plats01', PL, E], ['060', 'sweep24', SW, A]] },
{ id: 'S02E02C3', environment: 'Forest', layout: 32, code: '32146120031012059', stars: [9.5, 11.6, 14.2],
chunks: [['146', 'mix12', MX, VE], ['120', 'bumper07', BU, E], ['031', 'plats09', PL, A], ['012', 'convey03', CO, E], ['059', 'sweep23', SW, A]] },
{ id: 'S02E03C1', environment: 'Default', layout: 1, code: '01040079149017', stars: [9.6, 11.7, 14.4],
chunks: [['040', 'sweep02', SW, VE], ['079', 'mix05', MX, E], ['149', 'plats13', PL, VE], ['017', 'crank04', CR, A]] },
{ id: 'S02E03C2', environment: 'Default', layout: 1, code: '01015144000028', stars: [12.9, 15.8, 19.3],
chunks: [['015', 'crank02', CR, E], ['144', 'convey14', CO, VE], ['000', 'balls01', BB, A], ['028', 'plats06', PL, A]] },
{ id: 'S02E03C3', environment: 'Default', layout: 2, code: '02138135073083093', stars: [9.5, 11.6, 14.2],
chunks: [['138', 'bumper17', BU, VE], ['135', 'plats07', PL, A], ['073', 'pendul10', PE, E], ['083', 'mix09', MX, A], ['093', 'tramp06', TR, H]] },
{ id: 'S03E01C1', environment: 'Tiki', layout: 25, code: '25078135043087', stars: [9.6, 11.7, 14.4],
chunks: [['078', 'mix04', MX, A], ['135', 'plats07', PL, A], ['043', 'sweep05', SW, E], ['087', 'convey06', CO, A]] },
{ id: 'S03E01C2', environment: 'Tiki', layout: 26, code: '26012168113027002', stars: [10.0, 12.8, 15.7],
chunks: [['012', 'convey03', CO, E], ['168', 'crank18', CR, A], ['113', 'bumper14', null, null], ['027', 'plats02', PL, E], ['002', 'balls03', BB, A]] },
{ id: 'S03E01C3', environment: 'Tiki', layout: 26, code: '26166010053028071', stars: [10.3, 12.7, 15.5],
chunks: [['166', 'crank16', CR, E], ['010', 'convey01', CO, A], ['053', 'sweep17', SW, A], ['028', 'plats06', PL, A], ['071', 'tramp04', TR, H]] },
{ id: 'S03E02C1', environment: 'Pirate', layout: 7, code: '07162122154088', stars: [10.3, 12.7, 15.5],
chunks: [['162', 'tramp14', TR, E], ['122', 'pendul03', PE, H], ['154', 'plats14', PL, E], ['088', 'crank07', CR, H]] },
{ id: 'S03E02C2', environment: 'Pirate', layout: 8, code: '08105134167001063', stars: [10.6, 13.0, 15.8],
chunks: [['105', 'convey09', CO, A], ['134', 'bumper16', BU, VE], ['167', 'crank17', CR, E], ['001', 'balls02', BB, A], ['063', 'tramp03', TR, A]] },
{ id: 'S03E02C3', environment: 'Pirate', layout: 8, code: '08073020157169096', stars: [11.1, 13.6, 16.7],
chunks: [['073', 'pendul10', PE, E], ['020', 'pendul02', PE, E], ['157', 'mix15', MX, E], ['169', 'bumper19', BU, H], ['096', 'crank12', CR, A]] },
{ id: 'S03E03C1', environment: 'Medieval', layout: 19, code: '19047139072059', stars: [11.9, 14.6, 17.8],
chunks: [['047', 'sweep10', SW, A], ['139', 'crank14', CR, VE], ['072', 'pendul09', PE, A], ['059', 'sweep23', SW, A]] },
{ id: 'S03E03C2', environment: 'Medieval', layout: 20, code: '20020052013009002', stars: [12.4, 15.3, 18.6],
chunks: [['020', 'pendul02', PE, E], ['052', 'sweep15', SW, A], ['013', 'convey04', CO, E], ['009', 'bumper10', BU, E], ['002', 'balls03', BB, A]] },
{ id: 'S03E03C3', environment: 'Medieval', layout: 20, code: '20069005163078067', stars: [11.2, 13.8, 16.8],
chunks: [['069', 'plats12', PL, H], ['005', 'bumper04', BU, A], ['163', 'tramp15', TR, E], ['078', 'mix04', MX, A], ['067', 'sweep25', SW, H]] },
{ id: 'S04E01C1', environment: 'Fastfood', layout: 14, code: '14063060026048017', stars: [8.7, 10.7, 13.0],
chunks: [['063', 'tramp03', TR, A], ['060', 'sweep24', SW, A], ['026', 'plats01', PL, E], ['048', 'sweep11', SW, H], ['017', 'crank04', CR, A]] },
{ id: 'S04E01C2', environment: 'Fastfood', layout: 14, code: '14136106135000166', stars: [10.5, 12.8, 15.7],
chunks: [['136', 'plats08', PL, A], ['106', 'bumper12', BU, A], ['135', 'plats07', PL, A], ['000', 'balls01', BB, A], ['166', 'crank16', CR, E]] },
{ id: 'S04E01C3', environment: 'Fastfood', layout: 14, code: '14031170015075102', stars: [12.5, 15.4, 18.8],
chunks: [['031', 'plats09', PL, A], ['170', 'bumper20', BU, A], ['015', 'crank02', CR, E], ['075', 'mix01', MX, A], ['102', 'pendul14', PE, H]] },
{ id: 'S04E02C1', environment: 'Forest', layout: 32, code: '32046006079078001', stars: [10.2, 12.5, 15.3],
chunks: [['046', 'sweep09', SW, E], ['006', 'bumper05', BU, A], ['079', 'mix05', MX, E], ['078', 'mix04', MX, A], ['001', 'balls02', BB, A]] },
{ id: 'S04E02C2', environment: 'Forest', layout: 32, code: '32054018103159048', stars: [10.8, 13.2, 16.2],
chunks: [['054', 'sweep18', SW, E], ['018', 'crank05', CR, A], ['103', 'bumper11', BU, A], ['159', 'mix17', MX, E], ['048', 'sweep11', SW, H]] },
{ id: 'S04E02C3', environment: 'Forest', layout: 32, code: '32074161047068019', stars: [11.1, 13.6, 16.7],
chunks: [['074', 'pendul11', PE, A], ['161', 'tramp13', TR, E], ['047', 'sweep10', SW, A], ['068', 'plats11', PL, A], ['019', 'crank06', CR, H]] },
{ id: 'S04E03C1', environment: 'Default', layout: 2, code: '02128114105076126', stars: [10.6, 13.0, 15.8],
chunks: [['128', 'sweep16', SW, A], ['114', 'bumper15', null, null], ['105', 'convey09', CO, A], ['076', 'mix02', MX, A], ['126', 'tramp09', TR, A]] },
{ id: 'S04E03C2', environment: 'Default', layout: 2, code: '02051135081153002', stars: [10.7, 13.1, 16.0],
chunks: [['051', 'sweep14', SW, E], ['135', 'plats07', PL, A], ['081', 'mix07', MX, A], ['153', 'convey15', CO, E], ['002', 'balls03', BB, A]] },
{ id: 'S04E03C3', environment: 'Default', layout: 2, code: '02115168156091049', stars: [9.5, 11.6, 14.2],
chunks: [['115', 'convey10', null, null], ['168', 'crank18', CR, A], ['156', 'plats16', PL, H], ['091', 'tramp05', TR, H], ['049', 'sweep12', SW, A]] },
{ id: 'S05E01C1', environment: 'Tiki', layout: 26, code: '26115137024086097', stars: [9.5, 11.6, 14.2],
chunks: [['115', 'convey10', null, null], ['137', 'plats10', PL, H], ['024', 'pendul07', PE, E], ['086', 'bumper02', BU, A], ['097', 'balls04', BB, H]] },
{ id: 'S05E01C2', environment: 'Tiki', layout: 26, code: '26055011005085068', stars: [10.2, 12.6, 15.3],
chunks: [['055', 'sweep19', SW, A], ['011', 'convey02', CO, E], ['005', 'bumper04', BU, A], ['085', 'mix11', MX, H], ['068', 'plats11', PL, A]] },
{ id: 'S05E01C3', environment: 'Tiki', layout: 27, code: '27045026018009165118', stars: [12.5, 15.4, 18.8],
chunks: [['045', 'sweep08', SW, A], ['026', 'plats01', PL, E], ['018', 'crank05', CR, A], ['009', 'bumper10', BU, E], ['165', 'tramp17', TR, A], ['118', 'pendul15', null, null]] },
{ id: 'S05E02C1', environment: 'Pirate', layout: 8, code: '08049075041117002', stars: [10.7, 13.1, 16.0],
chunks: [['049', 'sweep12', SW, A], ['075', 'mix01', MX, A], ['041', 'sweep03', SW, E], ['117', 'convey11', null, null], ['002', 'balls03', BB, A]] },
{ id: 'S05E02C2', environment: 'Pirate', layout: 8, code: '08087014055101113', stars: [10.7, 13.1, 16.0],
chunks: [['087', 'convey06', CO, A], ['014', 'crank01', CR, E], ['055', 'sweep19', SW, A], ['101', 'pendul13', PE, A], ['113', 'bumper14', null, null]] },
{ id: 'S05E02C3', environment: 'Pirate', layout: 9, code: '09164025105076167048', stars: [10.8, 13.2, 16.2],
chunks: [['164', 'tramp16', TR, A], ['025', 'pendul08', PE, E], ['105', 'convey09', CO, A], ['076', 'mix02', MX, A], ['167', 'crank17', CR, E], ['048', 'sweep11', SW, H]] },
{ id: 'S05E03C1', environment: 'Medieval', layout: 20, code: '20028079010097096', stars: [10.6, 13.0, 15.8],
chunks: [['028', 'plats06', PL, A], ['079', 'mix05', MX, E], ['010', 'convey01', CO, A], ['097', 'balls04', BB, H], ['096', 'crank12', CR, A]] },
{ id: 'S05E03C2', environment: 'Medieval', layout: 20, code: '20158058022168099', stars: [11.0, 13.5, 16.5],
chunks: [['158', 'mix16', MX, E], ['058', 'sweep22', SW, H], ['022', 'pendul05', PE, A], ['168', 'crank18', CR, A], ['099', 'tramp08', TR, H]] },
{ id: 'S05E03C3', environment: 'Medieval', layout: 21, code: '21083163153103137094', stars: [11.8, 14.4, 17.7],
chunks: [['083', 'mix09', MX, A], ['163', 'tramp15', TR, E], ['153', 'convey15', CO, E], ['103', 'bumper11', BU, A], ['137', 'plats10', PL, H], ['094', 'crank10', CR, H]] },
];
export const ENVIRONMENTS = ['Default', 'Pirate', 'Fastfood', 'Medieval', 'Tiki', 'Forest'];
export const DIFFICULTY_ORDER = ['VeryEasy', 'Easy', 'Average', 'Hard'];
/** Parse "S01E02C3" -> {season:1, episode:2, course:3} */
export function parseCourseId(id) {
const m = /^S(\d\d)E(\d\d)C(\d)$/.exec(id);
return m ? { season: +m[1], episode: +m[2], course: +m[3] } : null;
}
export function getCourse(id) { return COURSES.find(c => c.id === id) || null; }
export function courseIndex(id) { return COURSES.findIndex(c => c.id === id); }
/** Highest listed chunk difficulty in the course (for display). */
export function courseDifficulty(course) {
let best = -1;
for (const ch of course.chunks) best = Math.max(best, DIFFICULTY_ORDER.indexOf(ch[3]));
return best < 0 ? 'Unspecified' : DIFFICULTY_ORDER[best];
}
/** Rebuild the course code from layout + chunk IDs (used by validators). */
export function computeCourseCode(course) {
return String(course.layout).padStart(2, '0') + course.chunks.map(c => c[0]).join('');
}
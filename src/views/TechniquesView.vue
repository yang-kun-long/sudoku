<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getAdvancedTechniqueCatalog } from '../advancedHint'
import { findTechniqueGuide, techniqueGuidePath } from '../techniqueGuides'

const techniques = [
  {
    id: 'last-cell',
    label: '最后空格',
    title: '最后空格：补齐区域缺少的数字',
    level: '初级',
    summary: '当一行、一列或一个宫只剩最后一个空格时，比较已经出现的八个数字，就能确定唯一缺少的数字。',
    rule: '把该区域中尚未出现的数字填入最后一个空格。',
    steps: ['找到只剩一个空格的行、列或宫', '检查该区域已经出现的八个数字', '将唯一缺少的数字填入空格'],
    cells: [
      { index: 0, value: 1, role: 'given' }, { index: 1, value: 2, role: 'given' }, { index: 2, value: 3, role: 'given' },
      { index: 3, value: 4, role: 'given' }, { index: 4, value: 5, role: 'given' }, { index: 5, value: 6, role: 'given' },
      { index: 6, value: 7, role: 'given' }, { index: 7, value: 8, role: 'given' },
      { index: 8, candidates: [9], key: [9], role: 'result' },
    ],
  },
  {
    id: 'naked-single',
    label: '唯一候选',
    title: '唯一候选：一个格只剩一个可能数字',
    level: '初级',
    summary: '综合同行、同列和同宫已经出现的数字后，某个空格只有一个数字仍然合法。',
    rule: '把剩下的唯一候选填入该格。',
    steps: ['查看目标格所在的行、列和宫', '排除这三个区域已经出现的数字', '当候选只剩一个时即可确定该格'],
    cells: [
      { index: 4, value: 2, role: 'given' }, { index: 13, value: 7, role: 'given' }, { index: 30, value: 5, role: 'given' },
      { index: 32, value: 6, role: 'given' }, { index: 36, value: 1, role: 'given' }, { index: 38, value: 3, role: 'given' },
      { index: 43, value: 8, role: 'given' }, { index: 67, value: 9, role: 'given' },
      { index: 40, candidates: [4], key: [4], role: 'result' },
    ],
  },
  {
    id: 'hidden-single',
    label: '唯一位置',
    title: '唯一位置：一个数字只剩一个落点',
    level: '初级',
    summary: '某个数字在一行、一列或一个宫中只出现在一个格的候选里；即使这个格还有其他候选，该数字也必须放在这里。',
    rule: '把只剩唯一位置的数字填入高亮格。',
    steps: ['选择一个区域和一个尚未出现的数字', '逐格检查该数字可以出现的位置', '只剩一个位置时即可确定该数字'],
    cells: [
      { index: 18, candidates: [1, 4], role: 'premise' }, { index: 19, candidates: [1, 4, 7], role: 'premise' },
      { index: 20, candidates: [2, 6], key: [6], role: 'result' }, { index: 21, candidates: [2, 5], role: 'premise' },
      { index: 22, candidates: [5, 8], role: 'premise' }, { index: 23, candidates: [2, 8], role: 'premise' },
      { index: 24, candidates: [3, 7], role: 'premise' }, { index: 25, candidates: [3, 9], role: 'premise' },
      { index: 26, candidates: [7, 9], role: 'premise' },
    ],
  },
  {
    id: 'naked-pair',
    label: '裸对',
    title: '裸对：两个格锁定两个数字',
    level: '中级',
    summary: '同一行、列或宫中有两个格都只包含相同的两个候选，这两个数字必定分别占据这两个格。',
    rule: '从该区域其他格中删除这两个候选。',
    steps: ['寻找候选数恰好为两个的空格', '确认同一区域中有两格共享同一候选对', '从区域内其他格删除这两个数字'],
    cells: [
      { index: 36, candidates: [2, 7], key: [2, 7], role: 'premise' },
      { index: 39, candidates: [2, 7], key: [2, 7], role: 'premise' },
      { index: 37, candidates: [2, 4, 7], eliminate: [2, 7], role: 'target' },
      { index: 40, candidates: [1, 2, 6], eliminate: [2], role: 'target' },
    ],
  },
  {
    id: 'hidden-pair',
    label: '隐对',
    title: '隐对：两个数字只藏在两个格里',
    level: '中级',
    summary: '某两个数字在一个区域中都只可能出现在相同的两个格内，因此这两个格必须由它们占据。',
    rule: '保留这两个数字，删除这两格中的其他候选。',
    steps: ['按数字查看它们在同一区域中的候选位置', '找到位置完全相同的两个数字', '清除这两格内不属于该数对的候选'],
    cells: [
      { index: 46, candidates: [1, 3, 5, 8], key: [3, 8], eliminate: [1, 5], role: 'premise' },
      { index: 52, candidates: [2, 3, 8, 9], key: [3, 8], eliminate: [2, 9], role: 'premise' },
    ],
  },
  {
    id: 'naked-triple',
    label: '裸三',
    title: '裸三：三个格锁定三个数字',
    level: '中级',
    summary: '同一行、列或宫中的三个格，候选数并集恰好只有三个，这三个数字必定由这三格占据。',
    rule: '从同一区域的其他格中删除这三个候选。',
    steps: ['找到候选数不超过三个的空格', '选择三格并检查候选并集是否恰好为三个数字', '从该行、列或宫的其他格删除这三个数字'],
    cells: [
      { index: 10, candidates: [2, 5], key: [2, 5], role: 'premise' },
      { index: 13, candidates: [2, 7], key: [2, 7], role: 'premise' },
      { index: 16, candidates: [5, 7], key: [5, 7], role: 'premise' },
      { index: 9, candidates: [2, 4, 5, 8], eliminate: [2, 5], role: 'target' },
      { index: 14, candidates: [3, 7, 9], eliminate: [7], role: 'target' },
    ],
  },
  {
    id: 'hidden-triple',
    label: '隐三',
    title: '隐三：三个数字只藏在三个格里',
    level: '中级',
    summary: '某三个数字在一个区域中只可能出现在相同的三个格内，即使这些格还写着其他候选，它们也已被这三个数字占满。',
    rule: '保留这三个数字，删除这三格中的其他候选。',
    steps: ['按数字查看它们在同一区域中的所有位置', '找到位置并集只有三格的三个数字', '清除这三格中不属于该组合的候选'],
    cells: [
      { index: 37, candidates: [1, 2, 4, 7], key: [1, 2], eliminate: [4, 7], role: 'premise' },
      { index: 40, candidates: [1, 3, 7], key: [1, 3], eliminate: [7], role: 'premise' },
      { index: 43, candidates: [2, 3, 6, 7], key: [2, 3], eliminate: [6, 7], role: 'premise' },
    ],
  },
  {
    id: 'pointing',
    label: '指向',
    title: '指向对与指向三：宫内候选锁定一条线',
    level: '高级',
    summary: '某个数字在一个宫中的所有候选都落在同一行或同一列，该数字在这条线上的位置必定处于这个宫内。',
    rule: '删除同一行或列上、位于该宫之外的相同候选。',
    steps: ['选择一个宫和一个候选数字', '确认它在宫内的两处或三处位置共线', '从宫外同一条线中删除该候选'],
    cells: [
      { index: 9, candidates: [2, 6], key: [6], role: 'premise' },
      { index: 11, candidates: [1, 6, 8], key: [6], role: 'premise' },
      { index: 13, candidates: [4, 6, 9], eliminate: [6], role: 'target' },
      { index: 16, candidates: [3, 6], eliminate: [6], role: 'target' },
    ],
  },
  {
    id: 'x-wing',
    label: 'X-Wing',
    title: 'X-Wing：两行两列组成矩形',
    level: '高级',
    summary: '同一候选在两行中都只出现在相同的两列。两行中的这个数字必定分别占据两列，因此两列的其他位置不能再出现它。',
    rule: '从两条覆盖列的其他行中删除该候选；行列方向可以互换。',
    steps: ['固定一个候选数字并逐行查看位置', '找到候选列完全相同的两行', '从这两列其余格子删除该候选'],
    cells: [
      { index: 11, candidates: [1, 4], key: [4], role: 'premise' },
      { index: 16, candidates: [4, 8], key: [4], role: 'premise' },
      { index: 56, candidates: [2, 4], key: [4], role: 'premise' },
      { index: 61, candidates: [4, 9], key: [4], role: 'premise' },
      { index: 29, candidates: [3, 4, 7], eliminate: [4], role: 'target' },
      { index: 79, candidates: [1, 4, 6], eliminate: [4], role: 'target' },
    ],
  },
  {
    id: 'y-wing',
    label: 'Y-Wing',
    title: 'Y-Wing：枢轴连接两个翼格',
    level: '高级',
    summary: '三个双候选格形成 {A,B}、{A,C}、{B,C}。无论枢轴选择 A 还是 B，两个翼格中总有一个必须是 C。',
    rule: '从同时受到两个翼格影响的格中删除候选 C。',
    steps: ['找到一个含两个候选的枢轴格', '寻找分别与枢轴共享一个候选的两个翼格', '删除两翼共同影响范围中的第三个候选'],
    cells: [
      { index: 40, candidates: [2, 7], key: [2, 7], role: 'pivot' },
      { index: 37, candidates: [2, 9], key: [2, 9], role: 'wing' },
      { index: 13, candidates: [7, 9], key: [7, 9], role: 'wing' },
      { index: 10, candidates: [1, 5, 9], eliminate: [9], role: 'target' },
    ],
  },
  {
    id: 'swordfish',
    label: '剑鱼',
    title: 'Swordfish：三行三列的鱼形结构',
    level: '专家',
    summary: '同一候选在三行中的位置全部被限制在相同的三列内。三行必须分别占据这三列，因此三列中的其他位置可以排除它。',
    rule: '从三条覆盖列中、不属于三条基础行的格子删除该候选；也可以转置为列对行。',
    steps: ['固定一个候选并找出只落在两至三列的行', '选择三行，确认候选位置并集恰好为三列', '从这三列的其他行删除该候选'],
    cells: [
      { index: 1, candidates: [2, 5], key: [5], role: 'premise' },
      { index: 4, candidates: [5, 8], key: [5], role: 'premise' },
      { index: 31, candidates: [1, 5], key: [5], role: 'premise' },
      { index: 35, candidates: [5, 9], key: [5], role: 'premise' },
      { index: 64, candidates: [3, 5], key: [5], role: 'premise' },
      { index: 71, candidates: [5, 7], key: [5], role: 'premise' },
      { index: 19, candidates: [2, 5, 6], eliminate: [5], role: 'target' },
      { index: 49, candidates: [4, 5, 8], eliminate: [5], role: 'target' },
      { index: 80, candidates: [1, 5, 9], eliminate: [5], role: 'target' },
    ],
  },
  {
    id: 'claiming',
    label: '区块削减',
    title: '区块削减：一条线把候选锁进一个宫',
    level: '中级',
    summary: '某个数字在一行或一列中的所有候选都位于同一个宫内，因此这个数字在该宫中的落点必定处于这条线上。',
    rule: '从同一宫内、位于这条线之外的格中删除该候选。它与“指向”方向相反，二者合称区块排除法。',
    steps: ['选择一行或一列及一个候选数字', '确认该数字在这条线上的所有位置都属于同一宫', '从宫内其余格删除这个候选'],
    cells: [
      { index: 0, candidates: [2, 5], key: [5], role: 'premise' },
      { index: 1, candidates: [5, 7], key: [5], role: 'premise' },
      { index: 9, candidates: [1, 5, 8], eliminate: [5], role: 'target' },
      { index: 19, candidates: [3, 5, 9], eliminate: [5], role: 'target' },
    ],
  },
  {
    id: 'jellyfish',
    label: '水母',
    title: 'Jellyfish：四行四列的鱼形结构',
    level: '专家',
    summary: '同一候选在四条基础行中的全部位置，只分布在四条覆盖列内。四个数字必须分别占据四列。',
    rule: '从四条覆盖列中、不属于四条基础行的格子删除该候选；行列方向可以互换。',
    steps: ['固定一个候选，找出候选不超过四处的行', '选择四行，确认候选列的并集恰好为四列', '从这四列的其他行删除该候选'],
    cells: [
      { index: 1, candidates: [2, 9], key: [9], role: 'premise' },
      { index: 3, candidates: [6, 9], key: [9], role: 'premise' },
      { index: 19, candidates: [4, 9], key: [9], role: 'premise' },
      { index: 23, candidates: [1, 9], key: [9], role: 'premise' },
      { index: 39, candidates: [5, 9], key: [9], role: 'premise' },
      { index: 43, candidates: [3, 9], key: [9], role: 'premise' },
      { index: 59, candidates: [7, 9], key: [9], role: 'premise' },
      { index: 61, candidates: [8, 9], key: [9], role: 'premise' },
      { index: 73, candidates: [4, 9], eliminate: [9], role: 'target' },
    ],
  },
  {
    id: 'skyscraper',
    label: '摩天楼',
    title: 'Skyscraper：两条强链竖起两个楼顶',
    level: '高级',
    summary: '同一候选在两行中都只剩两个位置，其中一端位于同一列。两个不对齐的外端至少有一个必须成立。',
    rule: '从同时能看到两个外端的格中删除该候选；也可以将行列互换。',
    steps: ['为同一候选找到两条行强链', '让两条强链各有一端对齐在同一列', '从两个未对齐外端的共同影响范围删除该候选'],
    cells: [
      { index: 0, candidates: [3, 6], key: [6], role: 'premise' },
      { index: 4, candidates: [2, 6], key: [6], role: 'premise' },
      { index: 27, candidates: [4, 6], key: [6], role: 'premise' },
      { index: 32, candidates: [6, 9], key: [6], role: 'premise' },
      { index: 14, candidates: [2, 6, 8], eliminate: [6], role: 'target' },
    ],
  },
  {
    id: 'two-string-kite',
    label: '双线风筝',
    title: '双线风筝：一条行强链连接一条列强链',
    level: '高级',
    summary: '同一候选的一条行强链和一条列强链，各有一端落在同一个宫内。两个宫外端点至少有一个必须成立。',
    rule: '从同时能看到两个宫外端点的格中删除该候选。',
    steps: ['找到同一候选的一条行强链和一条列强链', '确认两条链各有一端位于同一个宫', '删除两个宫外端点共同影响位置中的候选'],
    cells: [
      { index: 0, candidates: [2, 8], key: [8], role: 'premise' },
      { index: 4, candidates: [5, 8], key: [8], role: 'premise' },
      { index: 10, candidates: [1, 8], key: [8], role: 'premise' },
      { index: 46, candidates: [6, 8], key: [8], role: 'premise' },
      { index: 49, candidates: [3, 8, 9], eliminate: [8], role: 'target' },
    ],
  },
  {
    id: 'chain-aic',
    label: '链/AIC',
    title: '链与 AIC：沿箭头读强弱关系',
    level: '专家',
    summary: '链技巧不是看一堆格子，而是按顺序追踪候选之间的关系。实线表示强关系：两端至少一个成立；虚线表示弱关系：两端不能同时成立。',
    rule: '链的端点共同限制某个目标格时，可以删除目标格中的候选。',
    steps: ['固定一个候选或一组双候选格', '按箭头顺序阅读强关系与弱关系', '只看链的两个端点对目标格产生的共同限制', '删除被两端同时排除的候选'],
    links: [
      { from: 0, to: 7, relation: 'weak' },
      { from: 7, to: 24, relation: 'strong' },
      { from: 24, to: 15, relation: 'weak' },
      { from: 15, to: 10, relation: 'strong' },
      { from: 10, to: 46, relation: 'weak' },
      { from: 46, to: 47, relation: 'weak' },
    ],
    cells: [
      { index: 0, candidates: [2, 9], key: [9], role: 'chain-node' },
      { index: 7, candidates: [2, 4], key: [2], role: 'chain-node' },
      { index: 24, candidates: [1, 7], key: [1], role: 'chain-node' },
      { index: 15, candidates: [1, 7], key: [7], role: 'chain-node' },
      { index: 10, candidates: [5, 7], key: [7], role: 'chain-node' },
      { index: 46, candidates: [5, 9], key: [5], role: 'chain-node' },
      { index: 47, candidates: [3, 9], key: [9], role: 'chain-node' },
      { index: 2, candidates: [1, 4, 9], eliminate: [9], role: 'target' },
      { index: 45, candidates: [2, 6, 9], eliminate: [9], role: 'target' },
    ],
  },
  {
    id: 'xyz-wing',
    label: 'XYZ-Wing',
    title: 'XYZ-Wing：三候选枢轴连接两个翼格',
    level: '专家',
    summary: '一个三候选枢轴 {X,Y,Z} 连接两个双候选翼格 {X,Z} 与 {Y,Z}。三格中至少有一格必须是 Z。',
    rule: '从同时能看到枢轴和两个翼格的位置中删除候选 Z。',
    steps: ['找到一个三候选枢轴格', '找到两个与枢轴相交且都包含同一候选 Z 的双候选翼格', '从三格共同影响范围删除 Z'],
    cells: [
      { index: 10, candidates: [1, 2, 3], key: [1, 2, 3], role: 'pivot' },
      { index: 13, candidates: [1, 3], key: [1, 3], role: 'wing' },
      { index: 20, candidates: [2, 3], key: [2, 3], role: 'wing' },
      { index: 11, candidates: [3, 4], eliminate: [3], role: 'target' },
    ],
  },
  {
    id: 'junior-exocet',
    label: 'Exocet',
    title: 'Junior Exocet：两个基格约束两个目标格',
    level: '专家',
    summary: '两个同宫、同行的基格合计包含四个基数；三条交叉线对这些基数满足覆盖条件，使两个目标格只能各取一个不同的基数。',
    rule: '从两个目标格删除不属于基数集合的候选。本例直接取自你分享的题目。',
    steps: ['第 8 行第 1、2 列是基格，基数为 1、2、4、7', '检查目标格、伴随格与三条交叉线是否满足 Junior Exocet 的严格条件', '第 7 行第 8 列排除 9，第 9 行第 6 列排除 3'],
    guides: [
      { axis: 'column', index: 2, label: '第 3 列' },
      { axis: 'column', index: 5, label: '第 6 列' },
      { axis: 'column', index: 7, label: '第 8 列' },
    ],
    terms: [
      { name: '基格', description: '第 8 行第 1、2 列这两个蓝色格，是整个结构的起点。' },
      { name: '基数', description: '两个基格候选的并集，本题为 1、2、4、7。' },
      { name: '目标格', description: '第 7 行第 8 列与第 9 行第 6 列；证明成立后，它们只能取不同的基数。' },
      { name: '伴随格', description: '交换两个目标格的行、列得到的另外两个交点，本题是第 7 行第 6 列和第 9 行第 8 列。它们不能含有基数。' },
      { name: '交叉线', description: '基格宫内剩余的第 3 列，以及两个目标格所在的第 6、8 列。动画中的三条蓝色虚线带就是交叉线。' },
      { name: '覆盖条件', description: '在基格横带之外，每个基数在三条交叉线上的合法位置，必须集中在不超过两行中。' },
    ],
    cells: [
      { index: 63, candidates: [1, 2, 4, 7], key: [1, 2, 4, 7], role: 'base' },
      { index: 64, candidates: [1, 2, 4], key: [1, 2, 4], role: 'base' },
      { index: 59, value: 5, role: 'companion' },
      { index: 79, value: 5, role: 'companion' },
      { index: 61, candidates: [1, 2, 4, 7, 9], key: [1, 2, 4, 7], eliminate: [9], role: 'target' },
      { index: 77, candidates: [1, 2, 3, 4, 7], key: [1, 2, 4, 7], eliminate: [3], role: 'target' },
    ],
  },
]

const activeId = ref(techniques[0].id)
const paused = ref(false)
const animationVersion = ref(0)
const isDark = ref(localStorage.getItem('sudoku-theme') === 'dark')
const advancedStrategies = ref([])
const strategyQuery = ref('')
const activeTechnique = computed(() => techniques.find((technique) => technique.id === activeId.value) || techniques[0])
const activeGuide = computed(() => findTechniqueGuide(activeTechnique.value.id))
const exampleCells = computed(() => new Map(activeTechnique.value.cells.map((cell) => [cell.index, cell])))
const hasEliminations = computed(() => activeTechnique.value.cells.some((cell) => cell.eliminate?.length))
const hasPatternCells = computed(() => activeTechnique.value.cells.some((cell) => ['premise', 'wing', 'base', 'chain-node'].includes(cell.role)))
const demoLinks = computed(() => activeTechnique.value.links || [])
const animatedTechniqueGroups = computed(() => ['初级', '中级', '高级', '专家']
  .map((level) => ({ level, techniques: techniques.filter((technique) => technique.level === level) }))
  .filter((group) => group.techniques.length))
const strategyFamilies = [
  { id: 'foundation', label: '基础与候选组合' },
  { id: 'wing', label: '翼、矩形与染色' },
  { id: 'fish', label: '鱼形家族' },
  { id: 'chain', label: '链、环与强制推理' },
  { id: 'special', label: 'ALS、模板与特殊结构' },
]
const strategyGroups = computed(() => {
  const query = strategyQuery.value.trim().toLowerCase()
  const groups = new Map(strategyFamilies.map((family) => [family.id, []]))
  for (const strategy of advancedStrategies.value) {
    if (query && !strategy.toLowerCase().includes(query)) continue
    const fish = /(X-Wing|Swordfish|Jellyfish|Squirmbag|Whale|Leviathan|Kraken Fish)/.test(strategy)
    const chain = /(Chain|Loop|AIC|Forcing|Nishio|Bingo)/.test(strategy)
    const wing = /(Wing|Uniqueness|Rectangle|Colors|Remote Pair|Skyscraper|Kite|Turbot|Empty Rectangle|Universal Grave)/.test(strategy)
    const foundation = /(Single|House|Pair|Triple|Quadruple|Locked Candidate|Locked Pair|Locked Triple)/.test(strategy)
    const family = fish ? 'fish' : chain ? 'chain' : wing ? 'wing' : foundation ? 'foundation' : 'special'
    groups.get(family).push(strategy)
  }
  return strategyFamilies.map((family) => ({ ...family, strategies: groups.get(family.id) })).filter((family) => family.strategies.length)
})

function selectTechnique(id) {
  activeId.value = id
  paused.value = false
  animationVersion.value += 1
}
function strategyPath(strategy) { return techniqueGuidePath(strategy) }
function demoCell(index) { return exampleCells.value.get(index) }
function candidateClass(index, number) {
  const cell = demoCell(index)
  return {
    visible: cell?.candidates.includes(number),
    key: cell?.key?.includes(number),
    eliminated: cell?.eliminate?.includes(number),
  }
}
function guideStyle(guide) {
  if (guide.axis === 'column') return { left: `${guide.index * 100 / 9}%`, width: `${100 / 9}%` }
  return { top: `${guide.index * 100 / 9}%`, height: `${100 / 9}%` }
}
function cellPoint(index) {
  return { x: ((index % 9) + 0.5) * 100 / 9, y: (Math.floor(index / 9) + 0.5) * 100 / 9 }
}
function replay() {
  paused.value = false
  animationVersion.value += 1
}
function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('sudoku-theme', isDark.value ? 'dark' : 'light')
}

watch(isDark, (value) => { document.body.classList.toggle('dark-page', value) }, { immediate: true })
onMounted(async () => {
  document.title = '数独技巧图解 · Sudoku Lab'
  const hashId = window.location.hash.replace('#', '')
  if (techniques.some((technique) => technique.id === hashId)) selectTechnique(hashId)
  try { advancedStrategies.value = await getAdvancedTechniqueCatalog() } catch { advancedStrategies.value = [] }
})
onUnmounted(() => { document.title = '数独 · Sudoku Lab' })
</script>

<template>
  <main class="techniques-shell" :class="{ dark: isDark }">
    <header class="techniques-header">
      <div>
        <p class="eyebrow">SUDOKU LAB</p>
        <h1>数独技巧图解</h1>
      </div>
      <div class="techniques-actions">
        <RouterLink class="back-link" to="/">← 返回棋盘</RouterLink>
        <button class="icon-button" type="button" title="切换主题" aria-label="切换主题" @click="toggleTheme">◐</button>
      </div>
    </header>

    <section class="technique-picker" aria-label="选择数独技巧">
      <div v-for="group in animatedTechniqueGroups" :key="group.level" class="technique-group">
        <span>{{ group.level }}</span>
        <div role="tablist" :aria-label="`${group.level}技巧`">
          <button v-for="technique in group.techniques" :key="technique.id" type="button" role="tab" :aria-selected="activeId === technique.id" :class="{ active: activeId === technique.id }" @click="selectTechnique(technique.id)">{{ technique.label }}</button>
        </div>
      </div>
    </section>

    <section class="technique-stage">
      <figure class="demo-area">
        <div class="demo-toolbar">
          <span>{{ activeTechnique.level }}</span>
          <div>
            <button type="button" :title="paused ? '播放动画' : '暂停动画'" :aria-label="paused ? '播放动画' : '暂停动画'" @click="paused = !paused">{{ paused ? '▶' : 'Ⅱ' }}</button>
            <button type="button" title="重新播放" aria-label="重新播放" @click="replay">↻</button>
          </div>
        </div>
        <div :key="`${activeId}-${animationVersion}`" class="demo-board" :class="{ paused, exocet: activeId === 'junior-exocet' }" role="img" :aria-label="`${activeTechnique.title} 动画示例`">
          <div v-for="index in 81" :key="index" class="demo-cell" :class="[demoCell(index - 1)?.role, { 'has-elimination': demoCell(index - 1)?.eliminate?.length }]">
            <strong v-if="demoCell(index - 1)?.value" class="demo-value">{{ demoCell(index - 1).value }}</strong>
            <template v-else><span v-for="number in 9" :key="number" class="demo-candidate" :class="candidateClass(index - 1, number)">{{ number }}</span></template>
          </div>
          <span v-for="guide in activeTechnique.guides || []" :key="`${guide.axis}-${guide.index}`" class="pattern-guide" :class="guide.axis" :style="guideStyle(guide)" :title="guide.label"></span>
          <svg v-if="demoLinks.length" class="demo-chain-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="demo-chain-arrow-head" markerWidth="4" markerHeight="4" refX="3.4" refY="2" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L4,2 L0,4 Z"></path>
              </marker>
            </defs>
            <line v-for="(link, linkIndex) in demoLinks" :key="`${link.from}-${link.to}-${linkIndex}`" :class="['demo-chain-arrow', link.relation]" :style="{ '--delay': `${linkIndex * 0.35}s` }" :x1="cellPoint(link.from).x" :y1="cellPoint(link.from).y" :x2="cellPoint(link.to).x" :y2="cellPoint(link.to).y"></line>
          </svg>
        </div>
        <figcaption class="demo-legend">
          <template v-if="activeId === 'junior-exocet'">
            <span><i class="legend-source"></i>基格</span>
            <span><i class="legend-guide"></i>交叉线</span>
            <span><i class="legend-companion"></i>伴随格</span>
            <span><i class="legend-target"></i>目标格</span>
          </template>
          <template v-else>
            <span v-if="hasPatternCells"><i class="legend-source"></i>推理格</span>
            <span v-if="['y-wing', 'xyz-wing'].includes(activeId)"><i class="legend-pivot"></i>枢轴格</span>
            <span><i :class="hasEliminations ? 'legend-target' : 'legend-result'"></i>{{ hasEliminations ? '删除目标' : '结论格' }}</span>
          </template>
        </figcaption>
      </figure>

      <article class="technique-copy">
        <span class="level-label">{{ activeTechnique.level }}技巧</span>
        <h2>{{ activeTechnique.title }}</h2>
        <p>{{ activeTechnique.summary }}</p>
        <p class="rule-line"><strong>可得结论</strong>{{ activeTechnique.rule }}</p>
        <ol>
          <li v-for="step in activeTechnique.steps" :key="step">{{ step }}</li>
        </ol>
        <section v-if="activeGuide?.example" class="inline-example">
          <h3>{{ activeGuide.example.title }}</h3>
          <p>{{ activeGuide.example.setup }}</p>
          <ol>
            <li v-for="step in activeGuide.example.chain" :key="step">{{ step }}</li>
          </ol>
          <p class="inline-conclusion">{{ activeGuide.example.conclusion }}</p>
        </section>
        <RouterLink v-if="activeGuide" class="tutorial-link" :to="`/techniques/${activeGuide.id}`">阅读新手教程</RouterLink>
        <dl v-if="activeTechnique.terms?.length" class="term-list">
          <div v-for="term in activeTechnique.terms" :key="term.name">
            <dt>{{ term.name }}</dt>
            <dd>{{ term.description }}</dd>
          </div>
        </dl>
      </article>
    </section>

    <section class="strategy-library" aria-labelledby="strategy-library-title">
      <div class="library-heading">
        <div>
          <span class="level-label">HODOKU CORE</span>
          <h2 id="strategy-library-title">完整策略总览</h2>
        </div>
        <label class="strategy-search">
          <span>搜索策略</span>
          <input v-model="strategyQuery" type="search" placeholder="例如 AIC、Fish、Forcing" />
        </label>
      </div>
      <p class="library-count">已接入 {{ advancedStrategies.length }} 个技巧与变体；现有动画规则优先，高级核心按需在后台运行。</p>
      <div class="strategy-groups">
        <details v-for="group in strategyGroups" :key="group.id" :open="Boolean(strategyQuery)">
          <summary>{{ group.label }} <span>{{ group.strategies.length }}</span></summary>
          <div class="strategy-tags">
            <template v-for="strategy in group.strategies" :key="strategy">
              <RouterLink v-if="strategyPath(strategy)" :to="strategyPath(strategy)">{{ strategy }}</RouterLink>
              <span v-else>{{ strategy }}</span>
            </template>
          </div>
        </details>
      </div>
    </section>

    <footer class="techniques-footer"><RouterLink to="/">返回数独练习</RouterLink></footer>
  </main>
</template>

<style scoped>
.techniques-shell { width:min(1080px,calc(100% - 32px)); margin:0 auto; padding:36px 0 28px; color:var(--ink); }
.techniques-header { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:24px; }
.techniques-header h1 { font-size:clamp(28px,4vw,38px); }
.techniques-actions { display:flex; align-items:center; gap:10px; }
.back-link { min-height:40px; display:flex; align-items:center; padding:0 12px; border:1px solid var(--line); border-radius:7px; background:var(--surface); color:var(--ink); text-decoration:none; font-size:13px; font-weight:700; }
.technique-picker { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin-bottom:20px; }
.technique-group { min-width:0; padding:12px; border:1px solid var(--line); border-radius:8px; background:var(--surface); }
.technique-group > span { display:block; margin-bottom:8px; color:var(--accent); font-size:11px; font-weight:850; }
.technique-group > div { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
.technique-group button { min-width:0; min-height:34px; padding:0 8px; border:1px solid var(--line); border-radius:6px; background:transparent; color:var(--muted); font-size:12px; font-weight:750; white-space:normal; }
.technique-group button.active { border-color:var(--accent); background:var(--accent); color:#fff; }
.technique-stage { display:grid; grid-template-columns:minmax(320px,560px) minmax(260px,1fr); gap:clamp(26px,5vw,58px); align-items:center; padding:24px 0 34px; border-top:1px solid var(--line); border-bottom:1px solid var(--line); }
.demo-area { margin:0; min-width:0; }
.demo-toolbar { display:flex; justify-content:space-between; align-items:center; min-height:34px; margin-bottom:10px; color:var(--muted); font-size:11px; font-weight:800; }
.demo-toolbar > div { display:flex; gap:6px; }
.demo-toolbar button { width:32px; height:32px; padding:0; border:1px solid var(--line); border-radius:6px; background:var(--surface); color:var(--accent); }
.demo-board { position:relative; width:min(100%,540px); aspect-ratio:1; display:grid; grid-template-columns:repeat(9,1fr); grid-template-rows:repeat(9,1fr); border:2px solid var(--strong-line); background:var(--strong-line); gap:1px; overflow:hidden; }
.demo-cell { position:relative; min-width:0; display:grid; grid-template-columns:repeat(3,1fr); grid-template-rows:repeat(3,1fr); place-items:center; background:var(--surface); color:var(--muted); }
.demo-cell:nth-child(3n) { border-right:2px solid var(--strong-line); }
.demo-cell:nth-child(9n) { border-right:0; }
.demo-cell:nth-child(n+19):nth-child(-n+27),.demo-cell:nth-child(n+46):nth-child(-n+54) { border-bottom:2px solid var(--strong-line); }
.demo-candidate { width:100%; height:100%; display:grid; place-items:center; opacity:0; font-size:clamp(7px,1.25vw,11px); font-weight:750; line-height:1; }
.demo-candidate.visible { opacity:1; }
.demo-value { position:absolute; inset:0; display:grid; place-items:center; font-size:clamp(19px,3.2vw,30px); line-height:1; }
.demo-cell.given { background:#f0f2ed; color:var(--ink); }
.demo-cell.premise,.demo-cell.wing,.demo-cell.base,.demo-cell.chain-node { background:#e7f0fa; }
.demo-cell.pivot { background:#f5dfaa; box-shadow:inset 0 0 0 2px #bd8423; }
.demo-cell.result { background:#f5dfaa; box-shadow:inset 0 0 0 2px #bd8423; }
.demo-cell.companion { background:#f5dfaa; box-shadow:inset 0 0 0 2px #bd8423; }
.demo-cell.target,.demo-cell.has-elimination { box-shadow:inset 0 0 0 2px rgba(185,74,66,.72); }
.demo-candidate.key { color:#256295; }
.demo-candidate.eliminated { color:var(--danger); }
.pattern-guide { position:absolute; inset-block:0; z-index:3; pointer-events:none; border-left:2px dashed rgba(37,98,149,.8); border-right:2px dashed rgba(37,98,149,.8); background:rgba(37,98,149,.07); opacity:0; }
.pattern-guide.row { inset-inline:0; border:0; border-top:2px dashed rgba(37,98,149,.8); border-bottom:2px dashed rgba(37,98,149,.8); }
.demo-chain-overlay { position:absolute; inset:0; z-index:4; pointer-events:none; overflow:visible; }
.demo-chain-arrow { stroke:#256295; stroke-width:.48; stroke-linecap:round; marker-end:url(#demo-chain-arrow-head); filter:drop-shadow(0 1px 1px rgba(255,255,255,.78)); animation:demo-chain-flow 4.8s ease-in-out infinite; animation-delay:var(--delay); }
.demo-chain-arrow.weak { stroke:#9b5b1f; stroke-dasharray:2 1.3; }
.demo-chain-overlay marker path { fill:#256295; }
.demo-board:not(.paused) .demo-cell.premise,.demo-board:not(.paused) .demo-cell.wing,.demo-board:not(.paused) .demo-cell.pivot,.demo-board:not(.paused) .demo-cell.result,.demo-board:not(.paused) .demo-cell.chain-node { animation:pattern-pulse 4.8s ease-in-out infinite; }
.demo-board:not(.paused) .demo-candidate.key { animation:key-pulse 4.8s ease-in-out infinite; }
.demo-board:not(.paused) .demo-candidate.eliminated { animation:candidate-remove 4.8s ease-in-out infinite; }
.demo-board.exocet:not(.paused) .demo-cell.base { animation:exocet-base 7.2s ease-in-out infinite; }
.demo-board.exocet:not(.paused) .pattern-guide { animation:exocet-guide 7.2s ease-in-out infinite; }
.demo-board.exocet:not(.paused) .demo-cell.companion { animation:exocet-companion 7.2s ease-in-out infinite; }
.demo-board.exocet:not(.paused) .demo-cell.target { animation:exocet-target 7.2s ease-in-out infinite; }
.demo-board.exocet:not(.paused) .demo-candidate.key { animation:exocet-key 7.2s ease-in-out infinite; }
.demo-board.exocet:not(.paused) .demo-candidate.eliminated { animation:exocet-remove 7.2s ease-in-out infinite; }
.demo-board.paused * { animation-play-state:paused !important; }
.demo-legend { display:flex; flex-wrap:wrap; gap:14px; margin-top:12px; color:var(--muted); font-size:11px; }
.demo-legend span { display:flex; align-items:center; gap:5px; }
.demo-legend i { width:11px; height:11px; display:block; border-radius:2px; }
.legend-source { background:#e7f0fa; border:1px solid #76a2c7; }
.legend-pivot { background:#f5dfaa; border:1px solid #bd8423; }
.legend-guide { background:rgba(37,98,149,.08); border:1px dashed #256295; }
.legend-companion { background:#f5dfaa; border:1px solid #bd8423; }
.legend-target { background:transparent; border:2px solid var(--danger); }
.legend-result { background:#f5dfaa; border:1px solid #bd8423; }
.technique-copy { min-width:0; }
.level-label { color:var(--accent); font-size:11px; font-weight:800; }
.technique-copy h2 { margin:8px 0 16px; font-size:clamp(22px,3vw,30px); line-height:1.25; }
.technique-copy p { margin:0 0 16px; color:var(--muted); font-size:14px; line-height:1.8; }
.rule-line { padding:12px 0; border-top:1px solid var(--line); border-bottom:1px solid var(--line); color:var(--ink) !important; }
.rule-line strong { display:block; margin-bottom:4px; color:var(--accent); font-size:11px; }
.technique-copy ol { margin:18px 0 0; padding-left:22px; color:var(--muted); font-size:13px; line-height:1.8; }
.technique-copy li { padding-left:4px; }
.inline-example { margin-top:20px; padding-top:16px; border-top:1px solid var(--line); }
.inline-example h3 { margin:0 0 9px; font-size:16px; line-height:1.35; }
.inline-example p { margin-bottom:12px; font-size:13px; line-height:1.75; }
.inline-example ol { margin-top:10px; font-size:12px; line-height:1.7; }
.inline-conclusion { margin:14px 0 0 !important; padding:10px 11px; border-left:3px solid var(--accent); background:var(--accent-soft); color:var(--ink) !important; }
.tutorial-link { min-height:36px; display:inline-flex; align-items:center; margin-top:18px; padding:0 11px; border:1px solid var(--line); border-radius:6px; color:var(--accent); text-decoration:none; font-size:13px; font-weight:800; }
.term-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:0 18px; margin:20px 0 0; padding-top:4px; border-top:1px solid var(--line); }
.term-list div { padding:11px 0; border-bottom:1px solid var(--line); }
.term-list dt { color:var(--accent); font-size:12px; font-weight:800; }
.term-list dd { margin:4px 0 0; color:var(--muted); font-size:12px; line-height:1.65; }
.strategy-library { padding:34px 0 28px; border-bottom:1px solid var(--line); }
.library-heading { display:flex; align-items:end; justify-content:space-between; gap:24px; }
.library-heading h2 { margin:7px 0 0; font-size:24px; }
.strategy-search { display:grid; gap:5px; width:min(280px,100%); color:var(--muted); font-size:11px; font-weight:800; }
.strategy-search input { width:100%; height:38px; padding:0 11px; border:1px solid var(--line); border-radius:6px; background:var(--surface); color:var(--ink); font:inherit; font-size:13px; font-weight:500; letter-spacing:0; }
.library-count { margin:14px 0 20px; color:var(--muted); font-size:12px; }
.strategy-groups { border-top:1px solid var(--line); }
.strategy-groups details { border-bottom:1px solid var(--line); }
.strategy-groups summary { min-height:48px; display:flex; align-items:center; justify-content:space-between; gap:12px; color:var(--ink); cursor:pointer; font-size:13px; font-weight:800; list-style:none; }
.strategy-groups summary::-webkit-details-marker { display:none; }
.strategy-groups summary::before { content:'+'; width:16px; color:var(--accent); font-size:17px; }
.strategy-groups details[open] summary::before { content:'−'; }
.strategy-groups summary span { margin-left:auto; color:var(--muted); font-size:11px; }
.strategy-tags { display:flex; flex-wrap:wrap; gap:6px; padding:0 0 16px 28px; }
.strategy-tags span,.strategy-tags a { padding:5px 8px; border:1px solid var(--line); border-radius:4px; background:var(--surface); color:var(--muted); font-size:11px; line-height:1.3; text-decoration:none; }
.strategy-tags a { color:var(--accent); }
.techniques-footer { padding-top:20px; text-align:center; font-size:12px; }
.techniques-footer a { color:var(--accent); }
.dark .demo-cell.premise,.dark .demo-cell.wing,.dark .demo-cell.base,.dark .demo-cell.chain-node { background:#344e5c; }
.dark .demo-cell.given { background:#303b35; }
.dark .demo-cell.pivot,.dark .demo-cell.result,.dark .demo-cell.companion { background:#705921; }
.dark .legend-source { background:#344e5c; }
.dark .legend-pivot,.dark .legend-result { background:#705921; }
@keyframes pattern-pulse { 0%,100% { filter:none; } 18%,42% { filter:saturate(1.35) brightness(.96); } }
@keyframes key-pulse { 0%,100% { transform:scale(1); } 20%,42% { transform:scale(1.25); } }
@keyframes candidate-remove { 0%,38%,100% { opacity:1; transform:scale(1); text-decoration:none; } 52%,78% { opacity:.12; transform:scale(.55); text-decoration:line-through; } }
@keyframes demo-chain-flow { 0%,100% { opacity:.34; stroke-width:.4; } 24%,52% { opacity:.9; stroke-width:.66; } }
@keyframes exocet-base { 0%,100% { filter:none; } 8%,23% { filter:saturate(1.5) brightness(.94); box-shadow:inset 0 0 0 2px #256295; } 34% { filter:none; } }
@keyframes exocet-guide { 0%,20%,100% { opacity:0; transform:scaleY(.05); } 30%,72% { opacity:1; transform:scaleY(1); } 86% { opacity:.25; transform:scaleY(1); } }
@keyframes exocet-companion { 0%,35%,100% { filter:none; } 44%,61% { filter:saturate(1.45) brightness(.94); box-shadow:inset 0 0 0 2px #bd8423; } 72% { filter:none; } }
@keyframes exocet-target { 0%,56%,100% { background:var(--surface); } 66%,88% { background:rgba(185,74,66,.1); } }
@keyframes exocet-key { 0%,8%,100% { transform:scale(1); } 14%,23% { transform:scale(1.25); } }
@keyframes exocet-remove { 0%,67%,100% { opacity:1; transform:scale(1); text-decoration:none; } 76%,90% { opacity:.12; transform:scale(.55); text-decoration:line-through; } }
@media (max-width:900px) { .technique-picker { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media (max-width:760px) { .techniques-shell { padding-top:22px; } .technique-stage { grid-template-columns:1fr; align-items:start; } .demo-board { margin:0 auto; } .technique-copy { max-width:640px; } }
@media (max-width:460px) { .techniques-shell { width:min(100% - 18px,1080px); } .techniques-header { gap:8px; } .techniques-header .eyebrow { display:none; } .techniques-header h1 { font-size:23px; } .back-link { width:34px; min-height:32px; overflow:hidden; white-space:nowrap; padding:0 9px; color:transparent; font-size:0; } .back-link::before { content:'←'; color:var(--ink); font-size:18px; } .techniques-actions { gap:5px; } .technique-picker { grid-template-columns:1fr; gap:8px; margin-bottom:16px; } .technique-group { padding:10px; } .technique-group > div { grid-template-columns:repeat(3,minmax(0,1fr)); } .technique-group button { min-height:34px; padding:0 5px; font-size:12px; } .technique-stage { padding-top:16px; gap:24px; } .demo-toolbar { margin-bottom:7px; } .technique-copy h2 { font-size:21px; } .term-list { grid-template-columns:1fr; } .library-heading { align-items:stretch; flex-direction:column; gap:16px; } .strategy-search { width:100%; } .strategy-tags { padding-left:0; } }
@media (prefers-reduced-motion:reduce) { .demo-board * { animation:none !important; } .pattern-guide { opacity:1; transform:none; } .demo-chain-arrow { opacity:1; } }
</style>

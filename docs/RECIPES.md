# The recipe index

165 recipes in 15 families. Each row is a real drawing function in `cookbook/`; the id is what `kind:"recipe"` takes.

The live gallery is at `/plugins/dsh-artifacts/cookbook`; the searchable tool action is `artifact` with `action:"cookbook"`.

| Family | Recipes |
| --- | --- |
| Comparison and magnitude | 16 |
| Distribution | 10 |
| Time series | 13 |
| Relationships and correlation | 10 |
| Part-to-whole and hierarchy | 11 |
| Flow and networks | 7 |
| Maps | 8 |
| Statistics and machine learning | 17 |
| Math and science | 16 |
| Software and process diagrams | 10 |
| Tables, text and KPI parts | 9 |
| Interactive explainers | 8 |
| UI mockups and art | 11 |
| 3D and animation | 10 |
| Combining chart types | 9 |

## Comparison and magnitude

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `bar` | Bar / column chart | One number per category; compare sizes. Always start the value axis at 0. | Add a second mark layer (target line, error bars) or sort rows to make it a ranking. |
| `grouped` | Grouped bar chart | Compare several series inside each category. | Swap to stacked when the total matters more than the individual parts. |
| `stacked` | Stacked bar chart | Totals matter and so do the parts that make them up. | Only the bottom segment is easy to compare across bars. Use grouped if parts matter most. |
| `stacked100` | 100% stacked bar | Compare composition (shares), not totals. | Pair with a plain stacked chart if totals also matter. |
| `diverging` | Diverging stacked bar (Likert) | Survey scales: show agree vs disagree around a neutral centre. | Sort rows by net agreement to turn it into a ranking. |
| `lollipop` | Lollipop chart | Same job as a bar chart with less ink; good for many categories. | Highlight one category by changing only its circle colour. |
| `dumbbell` | Dumbbell chart | Before vs after (or two groups) for each item; the gap is the message. | Sort by gap size. Add arrowheads for direction of change. |
| `bullet` | Bullet chart | One value against a target, with qualitative ranges (poor / ok / good). | Stack several in a column to make a compact KPI panel. |
| `radialbar` | Radial bar chart | Decorative alternative to bars; inner rings are shorter, so read with care. | Rarely worth combining; prefer a plain bar when accuracy matters. |
| `waterfall` | Waterfall chart | How a starting value becomes an end value through gains and losses. | Works as the bottom half of a P&L dashboard with a table beside it. |
| `marimekko` | Marimekko (mosaic) chart | Two-way proportions: column width shows one share, segment height another. | Annotate the largest cells; too many cells makes it unreadable. |
| `waffle` | Waffle chart | Shares of a whole that people should read as "out of 100". | Replace squares with icons for a pictogram. |
| `funnel` | Funnel chart | Stages where each step loses some of the previous one. | Add conversion % between stages as small labels. |
| `pareto` | Pareto chart | Find the few causes that explain most of the total (the 80/20 view). | Bars + line is the classic two-layer combo; add a dashed 80% reference line. |
| `pyramid` | Population pyramid | Two mirrored distributions over the same categories (age bands by sex, A vs B). | Use as a small multiple across years to show change. |
| `slope` | Slope chart | How each item changed between exactly two moments. | With many time points it becomes a line chart; with ranks only, a bump chart. |

## Distribution

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `histogram` | Histogram | Shape of ONE numeric variable: centre, spread, skew, gaps. | Layer a density curve and a rug on top (see Combining recipes). |
| `density` | Density plot (KDE) | A smooth version of the histogram; good for comparing several groups. | Overlay several groups with transparency, or stack as a ridgeline. |
| `boxplot` | Box plot | Compare spread, median and outliers across groups at a glance. | Overlay the raw points (jitter) so n and clusters are visible. |
| `violin` | Violin plot | Box plot plus the full shape (bimodality shows up here, not in a box). | Draw a narrow box plot inside the violin. |
| `ridgeline` | Ridgeline (joy) plot | Compare many distributions that would overlap on one axis. | Order rows by median to show a trend across groups. |
| `beeswarm` | Beeswarm / strip plot | Show every point (small n) without overlap, plus the shape. | Add a median tick, or colour points by a second variable. |
| `ecdf` | ECDF (cumulative distribution) | Read percentiles directly; compare groups without choosing bins. | Overlay two groups; the vertical gap is the difference in percentiles. |
| `qq` | Q-Q plot | Check whether data follow a normal distribution (or any reference). | Place beside a histogram of the same data and the Shapiro-Wilk result. |
| `rug` | Rug / barcode plot | Raw observation positions for several groups in minimal space. | Usually drawn under a histogram or density curve as a second layer. |
| `bin2d` | 2D density (binned heatmap) | Scatter plot with too many points; show where they pile up. | Hexagonal bins are the same idea with a different tile shape. |

## Time series

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `line` | Line chart | Change over time for a few series. | Add a shaded band (uncertainty), markers for events, or switch to small multiples when there are more than 4 series. |
| `area` | Area chart | Emphasise the magnitude (volume) of one series over time. | Stack several for composition, or overlay two with transparency. |
| `stackedarea` | Stacked area chart | Total and composition over time. | Normalise to 100% to show shares; smooth the edges with K.curve for a streamgraph look. |
| `stream` | Streamgraph | Many categories over time where the overall shape and rise or fall matter more than exact values. | Best with direct labels on the thickest layers. |
| `step` | Step chart | Values that hold until they change (prices, settings, queue length). | Overlay events (vertical rules) that explain the jumps. |
| `sparkline` | Sparklines | Tiny trends next to numbers in tables and dashboards. | Put one in every row of a table (see "Table with sparklines" in the tables family). |
| `candlestick` | Candlestick (OHLC) chart | Prices that have an open, high, low and close for every period. | Add a moving-average line and a volume bar chart in a panel below sharing the x scale. |
| `calendar` | Calendar heatmap | Daily activity patterns (weekday vs weekend, streaks, holidays). | Pair with a bar chart of weekly totals sharing the same week axis. |
| `gantt` | Gantt chart | A schedule: who or what happens when, and what depends on what. | Add a "today" line, progress fill inside bars, or colour by owner. |
| `timeline` | Timeline | A short list of dated events in order. | Draw it above a line chart so events explain the bumps. |
| `fan` | Fan chart (forecast with uncertainty) | Forecasts: show the best guess AND how fast certainty is lost. | Overlay the actual values later to evaluate calibration. |
| `bump` | Bump chart (rank over time) | Who leads, who falls: ranks matter, exact values do not. | Highlight one series and grey out the rest. |
| `horizon` | Horizon chart | Many time series stacked in little vertical space. | Stack one row per region to compare many series at once. |

## Relationships and correlation

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `scatter` | Scatter plot | Relationship between two numeric variables; spot clusters and outliers. | Add a regression line, marginal histograms or colour by a third variable. |
| `bubble` | Bubble chart | A third numeric variable is shown by size. | Add colour for a fourth (categorical) variable. |
| `splom` | Scatter-plot matrix | Look at every pairwise relationship in a small set of variables. | Colour points by group; replace the upper triangle by correlation numbers (see Correlogram). |
| `correlogram` | Correlation matrix (correlogram) | Which variables move together? A grid of correlation coefficients. | Cluster rows and columns so correlated variables sit together. |
| `connected` | Connected scatter plot | Two variables that both change over time: see the path they take. | Same data as two line charts, but this shows how the relationship moves. |
| `regci` | Regression line with confidence band | A trend plus how sure we are about it. | This is a three-layer combination: points, band, line. |
| `parallel` | Parallel coordinates | Compare many numeric dimensions at once and see groups. | Brush an axis range to highlight rows (linked views pattern). |
| `quadrant` | Quadrant (2x2) chart | Prioritise items on two criteria (impact vs effort, risk vs reward). | Size the dots by a third variable (becomes a bubble chart). |
| `heatmap` | Heatmap (matrix) | A value for every pair of categories (hour by weekday, model by metric). | Order rows and columns by similarity (clustering) to reveal blocks. |
| `radar` | Radar (spider) chart | Profile of one or a few items across 5 to 8 comparable metrics. | Keep to 2 or 3 series; for more, use small multiples of single radars. |

## Part-to-whole and hierarchy

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `pie` | Pie chart | Few parts (2 to 5) of ONE whole, where the question is "which is the biggest share?". | Use a donut with the total in the middle, or a bar chart when shares are close. |
| `donut` | Donut chart | Same as a pie, with a total or key number in the hole. | Concentric donuts (rings) compare two periods. |
| `semipie` | Semi-circle (half) donut | Parliament-style shares or a gauge-like "x of y". | Gauges (tables and dashboards family) are the same shape with one value and a needle. |
| `treemap` | Treemap | Many parts of a whole in a hierarchy; size shows the share. | Click-to-zoom into a group (state = current root, then redraw) is the usual interactive extension. |
| `sunburst` | Sunburst chart | A hierarchy where the path from the centre outwards matters. | Same data as a treemap; choose a sunburst for paths, a treemap for comparing sizes. |
| `icicle` | Icicle chart | A hierarchy as stacked rows; easier to label than a sunburst. | The flame graph (flow family) is an icicle turned upside down. |
| `circlepack` | Circle packing | Sizes of many items where area matters and exact position does not. | Nest packs inside bigger circles for hierarchy; colour by category. |
| `tree` | Tree diagram (dendrogram layout) | Parent-child structure: taxonomy, file tree, clustering result. | Add leaf values as bars on the right to make a dendrogram with data. |
| `orgchart` | Org chart | Reporting lines: who belongs to whom. | Colour boxes by department or add a headcount badge. |
| `rose` | Nightingale rose (polar area) | Cyclical data (months, hours) where the circle reflects the cycle. | Stack two series per wedge for a second dimension. |
| `mindmap` | Mind map (radial tree) | Brainstorm structure around one central idea. | Mermaid can generate the same from text (see the diagrams family). |

## Flow and networks

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `sankey` | Sankey diagram | Quantities moving between stages; the width of a band is the amount. | Colour links by source; highlight one path by fading the others. |
| `alluvial` | Alluvial diagram | How members of categories move between categories over several time points. | Add a time axis label under each column. |
| `chord` | Chord diagram | Many-to-many relationships between a few groups (flows, co-occurrence). | Order groups to minimise crossing; fade all ribbons except the hovered group. |
| `arc` | Arc diagram | Links between ordered items (chapters, timeline, genome positions). | Arc heights show distance, so sort the nodes to reveal clusters. |
| `network` | Force-directed network | Who is connected to whom; clusters and hubs. | Drag-to-pin and hover-highlight neighbours make it interactive; the same graph as a matrix is below. |
| `adjacency` | Adjacency matrix | Dense networks where a node-link picture turns into a hairball. | Same data as the force network; show both side by side with linked highlighting. |
| `flame` | Flame graph | Where time (or memory) goes in nested function calls. | Click a frame to zoom (make it the new root and redraw). |

## Maps

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `choropleth` | Choropleth map | A value per region, shown as colour (rates and ratios, not raw counts). | Link it to a bar chart of the top regions, or add proportional symbols on the same projection. |
| `symbolmap` | Proportional symbol map | Counts or totals per place (circle area encodes the number). | Add a legend with 2 reference circles, or colour circles by category. |
| `dorling` | Dorling cartogram | Geography matters less than the size of the value; every region becomes a circle. | Colour by a second variable, e.g. growth rate. |
| `tilegrid` | Tile grid map (schematic) | Equal visual weight for every region (small states stay visible). | Use it as the overview and a choropleth for detail. |
| `globe` | Globe (orthographic projection) | Global data where distances and shapes near the poles should not be distorted. | Add a play button that increments lambda for a spinning globe, or arcs from the flow-map recipe. |
| `flowmap` | Flow (arc) map | Movement between places: routes, trade, migration. | Animate dashes along the arcs or filter by origin with a dropdown (linked views). |
| `dotdensity` | Dot density map | Show where things are in an area without implying exact positions (one dot = N units). | Colour dots by category for a multi-group version. |
| `contourmap` | Contour / isoline map | A continuous surface (elevation, temperature, density) as filled bands. | Overlay point markers or a coastline for a real map; the same data as a heatmap is the raster version. |

## Statistics and machine learning

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `residuals` | Residual plot | Check a regression: are errors patternless and equally spread? | Place beside the regression + confidence band recipe: the pair tells whether the fit can be trusted. |
| `roc` | ROC curve | How well a score separates two classes across ALL thresholds. | Draw several models as several lines; add the point for the threshold you actually use. |
| `prcurve` | Precision-recall curve | Imbalanced classes, where ROC looks too optimistic. | Show next to ROC; report average precision (area under this curve). |
| `confusion` | Confusion matrix | What kinds of mistakes a classifier makes at one chosen threshold. | Move the threshold with a slider and watch the ROC point move (linked views). |
| `learning` | Learning curve (train vs validation loss) | Diagnose over- and under-fitting while a model trains. | Add the learning rate schedule as a faint step line underneath (time + layering). |
| `importance` | Feature importance with uncertainty | Which inputs a model relies on, and how stable that ranking is. | Pair with partial dependence plots for the top features. |
| `pdp` | Partial dependence with ICE lines | How the prediction changes with one feature, averaged and per individual. | Stack several features as small multiples. |
| `boundary` | Decision boundary (k-nearest neighbours) | See what region of feature space a classifier assigns to each class. | Swap the classifier function and keep the drawing code: the pattern works for any model. |
| `pca` | PCA biplot | Squeeze many correlated variables into 2 axes and see which variables drive them. | Colour the dots by group or cluster; this is the basis for most "embedding scatter" plots. |
| `forest` | Forest plot (meta-analysis) | Combine several studies: each effect with its confidence interval, plus the pooled result. | Sort by year or weight; add heterogeneity statistics as text. |
| `km` | Kaplan-Meier survival curves | Time until an event (churn, failure, relapse) with censored observations. | Add confidence bands and a log-rank p-value in the corner. |
| `control` | Control chart (SPC) | Is a process stable, or did something change? | Add run rules (8 points on one side) and annotate known events. |
| `blandaltman` | Bland-Altman plot | Do two measurement methods agree? | Pair with a scatter plot of method A vs B (which hides bias). |
| `volcano` | Volcano plot | Thousands of tests at once: effect size against significance. | Label the top few genes; add a threshold line at p = 0.05. |
| `calibration` | Calibration (reliability) curve | When a model says "70%", does it happen 70% of the time? | Show the histogram of predictions under the curve so sparse bins are not over-read. |
| `errorbars` | Means with confidence intervals | Compare group averages and show the uncertainty of each. | Overlay the raw points (jitter) so n and spread stay visible. |
| `zshade` | Probability shading (interactive) | Teach or explore p-values and tail areas of a distribution. | Switch to two-sided mode or overlay a second (alternative) distribution to illustrate power. |

## Math and science

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `funcplot` | Function plot | Show curves y = f(x), their zeros and shape. | Slider for a parameter (frequency, damping) gives an interactive explorer; shade the area under a curve for integrals. |
| `lissajous` | Parametric curve (Lissajous) | Curves where x and y are BOTH functions of a parameter t. | Animate t with a Play button, or draw several (a, b) pairs as small multiples. |
| `polarplot` | Polar plot (rose curve) | Quantities that depend on an angle (antenna patterns, cycles, orbits). | Overlay two patterns for comparison. |
| `ternary` | Ternary plot | Three components that sum to 100% (soil, alloys, votes in three-party races). | Colour points by a fourth variable. |
| `vectorfield` | Vector field | A direction and magnitude at every point: flow, force, gradients. | Overlay streamlines or contour lines of the potential. |
| `phase` | Phase portrait (damped pendulum) | Behaviour of a dynamical system: where trajectories start, spiral and settle. | Overlay a vector field of the same equations underneath. |
| `fnheat` | Heatmap of f(x, y) | A function of two variables, read as colour. | Add isolines (contour recipe) and a colour bar. |
| `surface3d` | 3D surface (painter's algorithm) | A function of two variables as a surface, no WebGL needed. | Add a slider for rotation (see the rotating cube) or overlay the wireframe of a second surface. |
| `mandelbrot` | Mandelbrot set (escape-time fractal) | Illustrate iteration, complex numbers and fractals. | Mouse drag to zoom: change the window bounds and redraw. |
| `life` | Cellular automaton (Game of Life) | Show emergent behaviour from simple local rules. | The same state/step/draw skeleton drives every animated explainer. |
| `spectrum` | Signal and its spectrum (DFT) | See which frequencies a signal contains. | A spectrogram stacks many such spectra over time (time + heatmap). |
| `pendulum` | Pendulum simulation (animation) | Physics you can watch: state evolves under an equation of motion. | Plot the phase portrait live beside it (same state, two views). |
| `venn` | Venn diagram | Overlaps between 2 or 3 sets. | For more than 3 sets use an UpSet-style bar chart of intersections. |
| `geometry` | Geometric construction | Illustrate a theorem or construction (circumcircle, medians, bisectors). | Make the vertices draggable (pointer events + redraw) to explore. |
| `unitcircle` | Unit circle explorer (interactive) | Teach sine and cosine as coordinates on the unit circle. | Plot sin and cos against theta on the right (linked views) to see the waves emerge. |
| `fourier` | Fourier series builder (interactive) | Show how simple waves add up to a complicated one. | Show each term as a thin faint line and the spectrum (bars of 1/k) next to it. |

## Software and process diagrams

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `flowchart` | Flowchart (data-driven) | A process with decisions. | Add counts on the edges to turn it into a Sankey-like flow; colour nodes by status. |
| `sequence` | Sequence diagram | Who calls whom, in what order (API flows, protocols). | Mermaid draws the same from text: sequenceDiagram. |
| `classdiagram` | Class diagram | Object-oriented design: classes, fields, methods and inheritance. | Mermaid: classDiagram. |
| `statemachine` | State machine | Something that is in exactly one state and moves on events (orders, connections, UI). | Highlight the current state and drive it from buttons (state machine + interactive). |
| `swimlane` | Swimlane (cross-functional) diagram | A process that passes between people or teams. | Add durations to the boxes to see where time is lost. |
| `decisiontree` | Decision tree (classifier) | Explain how a tree model reaches a decision. | Draw the same tree's splits as lines on a scatter plot (decision boundary recipe). |
| `topology` | Network topology diagram | How devices and services are wired together. | Colour links by load to overlay data on the topology. |
| `gitgraph` | Git branch graph | Explain branching and merging. | Annotate commits with tags or CI status. |
| `architecture` | Layered architecture diagram | High-level structure of a system (UI, services, data). | Overlay latency or error rate per component. |
| `kanban` | Kanban board (HTML) | Work items by status. | Count per column feeds a cumulative-flow chart. |

## Tables, text and KPI parts

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `sorttable` | Sortable table | Rows the reader wants to rank by different columns. | Feed the same sorted array to a chart (table and chart can never disagree). |
| `heattable` | Heat table (conditional formatting) | A table where patterns matter more than exact numbers. | Add a sparkline column. |
| `sparktable` | Table with sparklines | Numbers plus their recent trend in one row. | Combine with sort: re-drawing the rows keeps the sparklines aligned. |
| `kpi` | KPI tiles | The 3 to 5 numbers someone must see first. | Place above charts in a dashboard; clicking a tile filters the charts below. |
| `gauge` | Gauge (dial) | One value against a range with good/bad zones (speed, utilisation, score). | Use sparingly: a bullet chart carries the same information with less space. |
| `wordcloud` | Word cloud | A quick look at the most frequent terms (not for precise comparison). | A bar chart of the top 10 words is easier to read; use the cloud only for mood. |
| `plans` | Comparison (pricing) cards | Two to four options compared on the same features. | A toggle (monthly/yearly) changes prices with one state variable. |
| `monthcal` | Month calendar | Dates, deadlines and events at a glance. | Colour days by value for the calendar heatmap. |
| `filterlist` | Searchable list (live filter) | Long lists where the reader knows what they are looking for. | Combine with a map or chart that highlights the filtered items. |

## Interactive explainers

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `bubblesort` | Bubble sort stepper | Teach an algorithm step by step. | Show the comparison count as a line chart growing with n. |
| `gradientdescent` | Gradient descent explorer | Teach learning rates: too small is slow, too large overshoots or diverges. | Plot loss against step number next to the parabola (linked views). |
| `binsearch` | Binary search visualiser | Show why halving the search range is so fast. | Plot steps against list size to show the logarithmic growth. |
| `compound` | Compound interest calculator | A formula with parameters people want to play with. | Add a second scenario line for comparison. |
| `quiz` | Quiz with instant feedback | Check understanding while reading. | Log answers to build a per-topic bar chart of strengths. |
| `flashcards` | Flashcards (flip) | Memorising terms and definitions. | Track which cards were missed and show them again first (spaced repetition). |
| `timer` | Countdown timer | Pomodoro-style focus sessions or exercises. | Record completed sessions and show them as a calendar heatmap. |
| `sampling` | Sampling distributions (SRS, stratified, cluster) | A Monte Carlo explainer of sampling designs: simple random, stratified and cluster all land on the truth, but their variance differs — stratified is the tightest, cluster the widest. | Add a sample-size slider: every SD falls like 1/sqrt(n), but the ordering between the three designs does not change. |

## UI mockups and art

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `uidash` | UI mockup: study dashboard | Show what a screen could look like before building it. | Replace the placeholder numbers with real chart recipes to get a working dashboard (see "Dashboard with shared state"). |
| `form` | Form with live validation | Collect input and tell people immediately what is wrong. | Add a password-strength bar drawn like a progress bar. |
| `hero` | Landing page hero + feature cards | The top of a product or project page. | Publish it as a web page (shareable link) or place real chart recipes inside the cards. |
| `poster` | Poster composition | A single bold graphic: event poster, title slide, cover. | Use the same palette as the charts in the same document so everything looks like one family. |
| `icons` | Icon set from primitives | Simple consistent icons without an icon font. | Use the same icons in KPI tiles and navigation. |
| `truchet` | Generative pattern (Truchet tiles) | Backgrounds and patterns from a tiny rule plus randomness. | Colour the arcs by a data value to make a "data texture". |
| `flowfield` | Flow field art | Organic, wind-like line art driven by a vector field. | The same loop traces streamlines of a real vector field (physics recipe). |
| `mandala` | Mandala (rotational symmetry) | Decorative radial designs. | Map a data series to petal length to make a radial bar chart with style. |
| `isometric` | Isometric blocks | 3D-looking bars, buildings or city skylines without a 3D engine. | Block height = data value gives an isometric bar chart over a map grid. |
| `pixelart` | Pixel art from a text map | Sprites, tiny icons, retro graphics. | Animate by swapping two frames of the map every half second. |
| `sunset` | Flat illustration: sunset over hills | Decorative scenes and hero images. | Use as a background layer behind a chart or title. |

## 3D and animation

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `cube3d` | Rotating 3D cube (no library) | A 3D object you can turn, without WebGL. | Add a 3D scatter inside the cube, or auto-rotate with a timer. |
| `scatter3d` | 3D scatter plot (rotatable) | Three numeric variables or three-dimensional clusters. | Colour by cluster; add a floor grid for orientation. |
| `particles` | Particle system (animation) | Fountains, sparks, snow: many short-lived moving objects. | Add wind as a slider that changes one velocity term. |
| `smil` | Declarative SVG animation (SMIL) | Simple loops (pulsing, travelling dots, spinning) with zero JavaScript timers. | Use it for loading indicators or to show direction along a Sankey link or network edge. |
| `shapes3d` | Rotating 3D solids you can turn with the mouse | Look at a 3D object from every side without WebGL: cube, torus, sphere, Mobius strip. | Colour faces by a data value, draw a 3D scatter inside the same scene, or animate the vertices (see the wave surface). |
| `solar` | Solar system (orbits in 3D, drag to tilt) | Show motion that depends on distance, in a scene you can view from any angle. | Add a trail per planet (keep the last positions, draw them fading), or plot distance-to-sun against time in a linked line chart. |
| `lorenz` | Lorenz attractor (a 3D curve being drawn live) | Show chaos: a deterministic system whose path never repeats and never settles. | Run a second copy from a start point that differs by 0.001 and draw both: they separate, which is sensitive dependence on initial conditions (see the double pendulum). |
| `starfield` | Starfield fly-through (steer with the pointer) | A cheap sense of depth and speed: points rushing past the camera. | Colour the stars by a data category and you have a 3D scatter you fly through. |
| `wave3d` | Animated 3D wave surface | A surface that changes over time: ripples, heat, a height field of data. | Replace the formula by a grid of real measurements per time step to animate a real field, e.g. temperature. |
| `doublependulum` | Double pendulum (chaos: two almost identical starts) | Show sensitive dependence on initial conditions: tiny differences grow until the motions look unrelated. | Plot the distance between the two bobs over time to see the exponential separation (linked line chart). |

## Combining chart types

| Id | Recipe | Use it when | Combines with |
| --- | --- | --- | --- |
| `combo-layers` | Layering: histogram + density + normal fit + rug | Several marks on ONE set of scales, each answering a different question. | The same pattern gives scatter + regression line + confidence band, or bars + target line. |
| `combo-violin` | Layering: violin + box + jittered points | Shape, summary and raw data in one glance. | Same layering idea: any distribution plot can carry the raw points. |
| `combo-multiples` | Small multiples (same chart, one panel per group) | Compare many groups without overplotting: repeat one chart with SHARED scales. | Works for any chart type; this is how to compare 20 regions or 12 months. |
| `combo-linked` | Linked views: filter one chart, the other updates | Exploration: select a range in one chart and see what it means in another. | Replace sliders with a drag-brush, or link a map and a table the same way. |
| `combo-dashboard` | Dashboard with shared state (KPIs + chart + table) | Several views of the same data that must always agree. | This is the general recipe for dashboards: add a view = add one render function. |
| `combo-annotated` | Annotated line chart (event band + callout) | Tell the story: what happened when. | Any chart can take this layer: it is just extra marks that use the chart's scales. |
| `combo-tilebar` | Linked map + bar chart (click to select) | Geography and ranking together, each explaining the other. | Use a real choropleth instead of tiles, or add a table. |
| `combo-tablechart` | Sortable table + bar chart that stay in sync | Readers want both the exact numbers and the picture, ordered the same way. | Add a filter input (see Searchable list) to the same draw(). |
| `combo-sparkgrid` | Small multiples of lines with a shared scale | Compare many time series at a glance. | Highlight the panel that deviates most, or sort panels by slope. |


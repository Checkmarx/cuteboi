<template>
    <div>
        <div ref="container" class="container">
        </div>
        <div class="no-data" v-if="noData">
            <div class="no-data__title">No Results</div>
            <div class="no-data__subtitle">
                <div class="no-data__button" @click="resetFilters">Click here</div>
                to reset filters
            </div>
        </div>
    </div>
</template>

<script>
import * as d3 from 'd3';
import * as PIXI from 'pixi.js';
import {Viewport} from 'pixi-viewport';
import {Cull} from '@pixi-essentials/cull';
import packageIcon from '../static/package.png'
import activePackageIcon from '../static/activePackage.png'
import serverIcon from '../static/server.png'
import userIcon from '../static/user.png'


export default {
    name: "graph",
    components: {},
    props: ['items', 'filters'],
    data() {
        return {
            pixiObjects: {},
            noData: false,
            graphWidth: 900,
            windowWidth: 900
        }
    },
    computed: {
        filteredItems() {
            let users = this.filters.users;
            let usersMap = this.filters.usersMap;
            let servers = this.filters.servers;
            let dates = this.filters.dates;
            let items = this.items;
            let startDate = new Date(dates[0])
            let endDate = new Date(dates[1])
            if (Object.values(usersMap).length && dates.length) {
                items = items.filter((item) => {
                    let username = item.username
                    let userAmount = usersMap[username]
                    let server = item.server
                    let date = new Date(item.date)
                    if (!users.includes(userAmount)) {
                        return false
                    }
                    if (!servers.includes(server)) {
                        return false
                    }
                    if (startDate > date || endDate < date) {
                        return false
                    }
                    return true
                })
            }
            return items
        },
        graphData() {
            let items = this.filteredItems;
            let links = []
            let nodesMap = {}
            let parentsMap = {}
            items.forEach((item) => {
                if (!Object.keys(parentsMap).includes(item.server)) {
                    let id = item.server;
                    parentsMap[item.server] = `${item.name}${item.version}${item.server}parentServer`
                    nodesMap[id] = {
                        server: item.server,
                        id: item.server,
                        icon: "server",
                        date: item.date,
                        antiSandbox: item.antiSandbox,
                        sample: item.sample
                    }
                }
                if (!Object.keys(parentsMap).includes(item.username)) {
                    let id = item.username;
                    parentsMap[item.username] = `${item.name}${item.version}${item.server}parentUser`
                    nodesMap[id] = {username: item.username, id: item.username, icon: "user"}
                }
                let nodeID = `${item.name}${item.version}${item.server}`;
                links.push({source: {id: item.server}, target: {id: nodeID}})
                links.push({source: {id: item.username}, target: {id: nodeID}})
                item.id = nodeID
                nodesMap[nodeID] = item

            })
            return {nodes: nodesMap, links: links}
        },
        useViewport() {
            return this.viewport
        },
        useSimulation() {
            return this.simulation
        },
    },
    mounted() {
        this.initGraph()
        let vm = this
        window.addEventListener('resize', function () {
            vm.windowWidth = window.innerWidth
            vm.graphWidth = vm.$parent.$refs.packages.clientWidth - 230
        });

    },
    methods: {
        initGraph() {
            let {nodes, links} = this.graphData
            let container = this.$refs.container;


            let height;
            let width;
            let containerRect;

            containerRect = container.getBoundingClientRect()
            height = containerRect.height;
            width = this.$parent.$refs.packages.clientWidth ? this.$parent.$refs.packages.clientWidth - 230 : this.graphWidth;

            let dragged = false;
            container.innerHTML = "";

            let app = new PIXI.Application({
                width,
                height,
                antialias: !0,
                transparent: !0,
                resolution: 1,
                autoResize: true
            });
            container.appendChild(app.view)
            container.firstElementChild.setAttribute("ref", "canvas")

            let viewport = new Viewport({
                screenWidth: width,
                screenHeight: height,
                worldWidth: width * 4,
                worldHeight: height * 4,
                passiveWheel: false,

                interaction: app.renderer.plugins.interaction
            });

            this.viewport = viewport

            app.stage.addChild(viewport);
            viewport.drag().pinch().wheel().decelerate().clampZoom({minWidth: width / 4, minHeight: height / 4});
            let simulation = d3.forceSimulation(Object.values(nodes))
                .force("link", d3.forceLink(this.graphData.links).id(d => d.id).distance(-10).strength(-100))
                .force("charge", d3.forceManyBody().strength(-300))
                .force("center", d3.forceCenter(width / 2, height / 2))
                .force("x", d3.forceX(width / 2).strength(0.01))
                .force("y", d3.forceY(height / 2).strength(0.01))
                .force("collision", d3.forceCollide().radius(20).strength(1))
                .velocityDecay(0.7);

            this.simulation = simulation

            const cull = new Cull().addAll(viewport.children);
            let cullDirty = false;
            viewport.on('frame-end', function () {
                if (viewport.dirty || cullDirty) {
                    cull.cull(app.renderer.screen);
                    viewport.dirty = false;
                    cullDirty = false;
                }
            })

            viewport.children.forEach((child) => child.destroy(true))

            let visualLinks = new PIXI.Graphics();
            viewport.addChild(visualLinks);
            let currDraggedNode;
            let vm = this;
            this.dragStart = function onDragStart(evt) {
                this.currPoint = {x: evt.data.originalEvent.x, y: evt.data.originalEvent.y}
                viewport.plugins.pause('drag');
                simulation.alphaTarget(0.3).restart();
                this.isDown = true;
                this.eventData = evt.data;
                this.alpha = 1;
                this.dragging = true;
            }

            this.dragEnd = function onDragEnd(evt) {
                if (this.currPoint.x === evt.data.originalEvent.x && this.currPoint.y === evt.data.originalEvent.y) {
                    if (vm.graphData.nodes[vm.currDraggedNode.id].icon !== "server" && vm.graphData.nodes[vm.currDraggedNode.id].icon !== "user") {
                        vm.$emit('itemSelected', vm.graphData.nodes[vm.currDraggedNode.id])
                    }
                }
                evt.stopPropagation();
                if (!evt.active) simulation.alphaTarget(0.1);
                this.alpha = 1;
                this.dragging = false;
                this.isOver = false;
                this.eventData = null;
                viewport.plugins.resume('drag');
            }

            this.dragMove = function onDragMove(node, gfx) {
                if (gfx.dragging) {
                    dragged = true;
                    const newPosition = gfx.eventData.getLocalPosition(gfx.parent);
                    this.x = newPosition.x;
                    this.y = newPosition.y;
                }
            }

            this.linksGraphics = {}
            const ticked = () => {
                Object.values(this.pixiObjects).forEach((node) => {
                    let x = node.x
                    let y = node.y
                    node.gfx.position = new PIXI.Point(x, y);
                });

                for (let i = visualLinks.children.length - 1; i >= 0; i--) {
                    visualLinks.children[i].destroy();
                }

                if (width !== this.graphWidth) {
                    this.viewport.moveCenter(this.graphWidth / 2, 444 / 2);
                    width = this.graphWidth
                }

                visualLinks.clear();
                visualLinks.removeChildren();
                visualLinks.alpha = 0;
                this.graphData.links.forEach((link) => {
                    let source = link.source.id;
                    let target = link.target.id;
                    if (!this.pixiObjects[source] || !this.pixiObjects[target]) {
                        return
                    }
                    let sourceNode = this.pixiObjects[source]
                    let targetNode = this.pixiObjects[target]
                    if (sourceNode.gfx.visible && targetNode.gfx.visible && viewport.lastViewport.scaleY > 0.1) {
                        visualLinks.alpha = 1
                    }
                    visualLinks.lineStyle(2, 0xaaaaaa);
                    visualLinks.moveTo(sourceNode.x, sourceNode.y);
                    visualLinks.lineTo(targetNode.x, targetNode.y);
                    visualLinks.name = `${sourceNode.id}###${targetNode.id}`
                    this.linksGraphics[visualLinks.name] = visualLinks
                });
                visualLinks.endFill();
            }
            this.viewport = viewport
            this.app = app
            this.simulation.on("tick", ticked);
        },
        restartForce() {
            let sim = this.useSimulation
            let nodes = this.graphData.nodes
            sim.nodes(Object.values(nodes)).restart();
            sim.alpha(1)
        },
        resetFilters() {
            this.$emit('resetFilters')
        },
        resize() {
        }
    },
    watch: {
        graphData: {
            handler() {
                this.maxX = null;
                this.minX = null;
                this.maxY = null;
                this.minY = null;
                let vm = this;
                let dragged = false;
                const icon = (d) => {
                    if (d.icon === "server") {
                        return serverIcon
                    } else if (d.icon === "user") {
                        return userIcon
                    } else {
                        return d.available ? activePackageIcon : packageIcon
                    }
                }
                let viewport = this.useViewport
                viewport.children.length = 1;
                let nodes = this.graphData.nodes
                Object.values(nodes).forEach((node) => {
                    const boundDrag = this.dragMove.bind(node);
                    let name = (d) => {
                        if (d.icon === "server") {
                            return d.server
                        } else if (d.icon === "user") {
                            return d.username
                        }
                        return d.name
                    };

                    let item = node;
                    item.gfx = new PIXI.Sprite.from(icon(node));
                    if (node.icon === "server") {
                        item.gfx.width = 76
                        item.gfx.height = 60
                    } else if (node.icon === "user") {
                        item.gfx.width = 40
                        item.gfx.height = 44
                    } else {
                        item.gfx.width = 76.2
                        item.gfx.height = 89
                    }
                    item.gfx.id = node.id;
                    let currName = name(node)
                    item.name = currName
                    item.gfx.anchor.set(0.5)
                    item.gfx
                        .on('click', (e) => {
                            if (!dragged) {
                                e.stopPropagation();
                            }
                            dragged = false;
                        })
                        .on('mousedown', this.dragStart)
                        .on('mouseup', this.dragEnd)
                        .on('mouseupoutside', this.dragEnd)
                        .on('mousemove', () => boundDrag(node, node.gfx));
                    let nodeID = node.id
                    item.gfx.type = node.icon
                    viewport.addChild(node.gfx);

                    item.gfx.interactive = true;
                    item.gfx.buttonMode = true;
                    item.gfx.hitArea = new PIXI.Rectangle(-40, -40, 100, 100);
                    item.gfx.on('mouseover', (mouseData) => {
                        vm.currDraggedNode = node
                        const text = new PIXI.Text(currName, {
                            fontSize: 30,
                            fontFamily: "roboto",
                            fontWeight: 700,
                            fill: '#000',
                            strokeThickness: 4,
                            stroke: '#fff'
                        });
                        text.anchor.set(0.5);
                        text.resolution = 2;
                        text.position.y = -110;
                        item.gfx.addChild(text);
                    });
                    item.gfx.on('mouseout', () => {
                        node.gfx.removeChildren()
                    });
                    if (!this.maxX) {
                        this.maxX = item.x
                    }
                    if (!this.maxY) {
                        this.maxY = item.y
                    }
                    if (!this.minX) {
                        this.minX = item.x
                    }
                    if (!this.minY) {
                        this.minY = item.y
                    }
                    this.maxX = Math.max(this.maxX, item.x)
                    this.maxY = Math.max(this.maxY, item.y)
                    this.minX = Math.min(this.minX, item.x)
                    this.minY = Math.min(this.minY, item.y)
                    this.pixiObjects[nodeID] = item
                });
                viewport.scale.set(0.2)
                viewport.moveCenter(this.graphWidth / 2, viewport.options.screenHeight / 2)
                this.viewport = viewport
                let links = this.graphData.links
                links.forEach((link) => {
                    let source = link.source.id
                    let target = link.target.id
                    let sourceX = this.graphData.nodes[source].x
                    let sourceY = this.graphData.nodes[source].y
                    this.graphData.nodes[target].x = sourceX + Math.random() * links.length
                    this.graphData.nodes[target].y = sourceY + Math.random() * links.length
                })
                this.useSimulation.alpha(1).restart();
                this.restartForce()
                this.noData = Object.keys(this.graphData.nodes).length === 0
            }
        },
        graphWidth: {
            handler() {
                if (this.windowWidth < 1200) {
                    this.app.renderer.resize(this.graphWidth, 400)
                    this.viewport.moveCenter(this.graphWidth / 2, 400 / 2)
                } else {
                    this.app.renderer.resize(this.graphWidth, 444)
                    this.viewport.moveCenter(this.graphWidth / 2, 444 / 2)
                }
                this.useSimulation.alpha(1).restart();
            }
        },
        windowWidth: {
            handler() {
            }
        }
    }

}
</script>

<style scoped lang="scss">
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap');

.container {
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.no-data {
    position: absolute;
    font-family: "roboto", sans-serif;
    color: black;
    z-index: 10;
    font-size: 20px;
    display: flex;
    flex-direction: column;
    place-items: center;
    place-content: center;
    user-select: none;

    &__title {
        font-size: 24px;
        font-weight: bold;
        color: #B20000;
        padding-bottom: 4px;
    }

    &__subtitle {
        font-size: 16px;
        font-weight: lighter;
        color: #4C0000;
    }

    &__button {
        display: inline-block;
        text-decoration: underline;
        cursor: pointer;

        &:hover {
            opacity: 0.6;
        }
    }
}
</style>

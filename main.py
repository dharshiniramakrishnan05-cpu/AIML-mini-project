import pygame
import math
import queue
import random

pygame.init()

# Constants
WIDTH, HEIGHT = 1275, 650 # Approx size based on grid
ROWS, COLS = 21, 51
GRID_WIDTH = 1275
GRID_HEIGHT = 525 # Leaving space for header
NODE_SIZE = 25

# Colors (matching the CSS)
BG_COLOR = (15, 23, 42)
PANEL_BG = (30, 41, 59)
TEXT_PRIMARY = (248, 250, 252)
TEXT_SECONDARY = (203, 213, 225)

PRIMARY = (59, 130, 246)

NODE_UNVISITED = (255, 255, 255)
NODE_VISITED = (0, 190, 218)
NODE_WALL = (30, 41, 59)
NODE_START = (34, 197, 94)
NODE_TARGET = (239, 68, 68)
NODE_PATH = (250, 204, 21)
GRID_LINE_COLOR = (203, 213, 225)

window = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Search Algorithm Visualizer")

# Fonts
font = pygame.font.SysFont("inter", 20)
large_font = pygame.font.SysFont("inter", 26, bold=True)
small_font = pygame.font.SysFont("inter", 16)

class Node:
    def __init__(self, row, col):
        self.row = row
        self.col = col
        self.x = col * NODE_SIZE
        self.y = row * NODE_SIZE + (HEIGHT - GRID_HEIGHT)
        self.is_start = False
        self.is_target = False
        self.is_wall = False
        self.is_visited = False
        self.is_path = False
        self.neighbors = []

    def draw(self, win):
        color = NODE_UNVISITED
        if self.is_start:
            color = NODE_START
        elif self.is_target:
            color = NODE_TARGET
        elif self.is_path:
            color = NODE_PATH
        elif self.is_visited:
            color = NODE_VISITED
        elif self.is_wall:
            color = NODE_WALL

        pygame.draw.rect(win, color, (self.x, self.y, NODE_SIZE, NODE_SIZE))
        pygame.draw.rect(win, GRID_LINE_COLOR, (self.x, self.y, NODE_SIZE, NODE_SIZE), 1)

    def update_neighbors(self, grid):
        self.neighbors = []
        if self.row < ROWS - 1 and not grid[self.row + 1][self.col].is_wall: # DOWN
            self.neighbors.append(grid[self.row + 1][self.col])
        if self.row > 0 and not grid[self.row - 1][self.col].is_wall: # UP
            self.neighbors.append(grid[self.row - 1][self.col])
        if self.col < COLS - 1 and not grid[self.row][self.col + 1].is_wall: # RIGHT
            self.neighbors.append(grid[self.row][self.col + 1])
        if self.col > 0 and not grid[self.row][self.col - 1].is_wall: # LEFT
            self.neighbors.append(grid[self.row][self.col - 1])


def make_grid():
    grid = []
    for i in range(ROWS):
        grid.append([])
        for j in range(COLS):
            node = Node(i, j)
            grid[i].append(node)
    
    # Set default start and target
    grid[10][10].is_start = True
    grid[10][40].is_target = True
    return grid, grid[10][10], grid[10][40]

def draw_grid(win, grid):
    for row in grid:
        for node in row:
            node.draw(win)

def draw_header(win, selected_algo):
    pygame.draw.rect(win, PANEL_BG, (0, 0, WIDTH, HEIGHT - GRID_HEIGHT))
    
    title = large_font.render("AlgoVision (Python)", True, PRIMARY)
    win.blit(title, (20, 30))

    algo_text = font.render(f"Algorithm: {selected_algo}", True, TEXT_PRIMARY)
    win.blit(algo_text, (250, 30))
    
    controls_text = font.render("Set Algo: [B] BFS | [D] DFS | [A] A* | [G] Greedy", True, TEXT_SECONDARY)
    win.blit(controls_text, (250, 60))

    actions_text = font.render("[SPACE] Visualize | [C] Clear Board | [P] Clear Path | [M] Maze", True, TEXT_SECONDARY)
    win.blit(actions_text, (700, 45))

    instructions = small_font.render("Left Click: Draw Wall / Move Node | Right Click: Erase Wall", True, TEXT_SECONDARY)
    win.blit(instructions, (20, 90))

def draw(win, grid, selected_algo):
    win.fill(BG_COLOR)
    draw_header(win, selected_algo)
    draw_grid(win, grid)
    pygame.display.update()

def clear_path(grid):
    for row in grid:
        for node in row:
            node.is_visited = False
            node.is_path = False

def clear_board(grid):
    for row in grid:
        for node in row:
            node.is_wall = False
            node.is_visited = False
            node.is_path = False

def generate_maze(grid):
    clear_board(grid)
    for row in grid:
        for node in row:
            if not node.is_start and not node.is_target and random.random() < 0.3:
                node.is_wall = True

def h(p1, p2):
    return abs(p1.row - p2.row) + abs(p1.col - p2.col)

def reconstruct_path(came_from, current, draw_func):
    while current in came_from:
        current = came_from[current]
        if not current.is_start and not current.is_target:
            current.is_path = True
            draw_func()
            pygame.time.delay(30)

def astar(draw_func, grid, start, target):
    count = 0
    open_set = queue.PriorityQueue()
    open_set.put((0, count, start))
    came_from = {}
    g_score = {node: float("inf") for row in grid for node in row}
    g_score[start] = 0
    f_score = {node: float("inf") for row in grid for node in row}
    f_score[start] = h(start, target)

    open_set_hash = {start}

    while not open_set.empty():
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()

        current = open_set.get()[2]
        open_set_hash.remove(current)

        if current == target:
            reconstruct_path(came_from, target, draw_func)
            return True

        for neighbor in current.neighbors:
            temp_g_score = g_score[current] + 1

            if temp_g_score < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = temp_g_score
                f_score[neighbor] = temp_g_score + h(neighbor, target)
                if neighbor not in open_set_hash:
                    count += 1
                    open_set.put((f_score[neighbor], count, neighbor))
                    open_set_hash.add(neighbor)
                    if not neighbor.is_target:
                        neighbor.is_visited = True

        draw_func()
        if current != start:
            pass
        pygame.time.delay(10)
    return False

def greedy(draw_func, grid, start, target):
    count = 0
    open_set = queue.PriorityQueue()
    open_set.put((0, count, start))
    came_from = {}

    open_set_hash = {start}
    visited = set([start])

    while not open_set.empty():
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()

        current = open_set.get()[2]
        open_set_hash.remove(current)

        if current == target:
            reconstruct_path(came_from, target, draw_func)
            return True

        for neighbor in current.neighbors:
            if neighbor not in visited:
                visited.add(neighbor)
                came_from[neighbor] = current
                count += 1
                open_set.put((h(neighbor, target), count, neighbor))
                open_set_hash.add(neighbor)
                if not neighbor.is_target:
                    neighbor.is_visited = True

        draw_func()
        pygame.time.delay(10)
    return False


def bfs(draw_func, grid, start, target):
    q = queue.Queue()
    q.put(start)
    came_from = {}
    visited = set([start])

    while not q.empty():
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()

        current = q.get()

        if current == target:
            reconstruct_path(came_from, target, draw_func)
            return True

        for neighbor in current.neighbors:
            if neighbor not in visited:
                visited.add(neighbor)
                came_from[neighbor] = current
                q.put(neighbor)
                if not neighbor.is_target:
                    neighbor.is_visited = True

        draw_func()
        pygame.time.delay(10)
    return False

def dfs(draw_func, grid, start, target):
    stack = [start]
    came_from = {}
    visited = set([start])

    while stack:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()

        current = stack.pop()

        if current == target:
            reconstruct_path(came_from, target, draw_func)
            return True

        for neighbor in reversed(current.neighbors):
            if neighbor not in visited:
                visited.add(neighbor)
                came_from[neighbor] = current
                stack.append(neighbor)
                if not neighbor.is_target:
                    neighbor.is_visited = True

        draw_func()
        pygame.time.delay(10)
    return False


def get_clicked_pos(pos):
    x, y = pos
    if y < HEIGHT - GRID_HEIGHT:
        return None, None
    row = (y - (HEIGHT - GRID_HEIGHT)) // NODE_SIZE
    col = x // NODE_SIZE
    return row, col

def main():
    grid, start, target = make_grid()
    run = True
    algorithms = {"BFS": bfs, "DFS": dfs, "A*": astar, "Greedy": greedy}
    selected_algo = "BFS"
    
    dragging_node = None
    drawing_wall = False

    while run:
        draw(window, grid, selected_algo)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                run = False
            
            if pygame.mouse.get_pressed()[0]: # LEFT CLICK
                pos = pygame.mouse.get_pos()
                row, col = get_clicked_pos(pos)
                if row is not None and col is not None and row < ROWS and col < COLS:
                    node = grid[row][col]
                    
                    if not dragging_node and not drawing_wall:
                        if node == start:
                            dragging_node = 'start'
                        elif node == target:
                            dragging_node = 'target'
                        elif node != start and node != target:
                            drawing_wall = True
                            node.is_wall = True
                    elif dragging_node:
                        if dragging_node == 'start' and node != target and not node.is_wall:
                            start.is_start = False
                            start = node
                            start.is_start = True
                        elif dragging_node == 'target' and node != start and not node.is_wall:
                            target.is_target = False
                            target = node
                            target.is_target = True
                    elif drawing_wall:
                        if node != start and node != target:
                            node.is_wall = True

            elif pygame.mouse.get_pressed()[2]: # RIGHT CLICK
                pos = pygame.mouse.get_pos()
                row, col = get_clicked_pos(pos)
                if row is not None and col is not None and row < ROWS and col < COLS:
                    node = grid[row][col]
                    if node != start and node != target:
                        node.is_wall = False

            if event.type == pygame.MOUSEBUTTONUP:
                dragging_node = None
                drawing_wall = False

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_b:
                    selected_algo = "BFS"
                elif event.key == pygame.K_d:
                    selected_algo = "DFS"
                elif event.key == pygame.K_a:
                    selected_algo = "A*"
                elif event.key == pygame.K_g:
                    selected_algo = "Greedy"

                if event.key == pygame.K_SPACE:
                    for row in grid:
                        for node in row:
                            node.update_neighbors(grid)
                    clear_path(grid)
                    algorithms[selected_algo](lambda: draw(window, grid, selected_algo), grid, start, target)

                if event.key == pygame.K_c:
                    clear_board(grid)
                
                if event.key == pygame.K_p:
                    clear_path(grid)

                if event.key == pygame.K_m:
                    generate_maze(grid)

    pygame.quit()

if __name__ == "__main__":
    main()

def solve():
    n = int(input())
    slides = []
    for _ in range(n):
        parts = list(map(int, input().split()))
        slides.append(tuple(parts))

    x, y, energy = map(int, input().split())

    def is_on_segment(px, py, x1, y1, x2, y2):
        min_x, max_x = min(x1, x2), max(x1, x2)
        min_y, max_y = min(y1, y2), max(y1, y2)

        if not (min_x <= px <= max_x and min_y <= py <= max_y):
            return False

        return (px - x1) * (y2 - y1) == (py - y1) * (x2 - x1)

    def find_slides_at(px, py):
        result = []
        for i, (x1, y1, x2, y2) in enumerate(slides):
            if is_on_segment(px, py, x1, y1, x2, y2):
                result.append(i)
        return result

    def get_next_slide_below(px, py):
        for test_y in range(py - 1, -1, -1):
            if find_slides_at(px, test_y):
                return px, test_y
        return px, 0

    while y > 0:
        slide_indices = find_slides_at(x, y)

        if slide_indices:
            if len(slide_indices) > 1:
                unlock_cost = x * y
                if energy >= unlock_cost:
                    energy -= unlock_cost
                else:
                    break

            moved = False
            for slide_idx in slide_indices:
                x1, y1, x2, y2 = slides[slide_idx]

                dx = 1 if x2 > x1 else (-1 if x2 < x1 else 0)
                dy = 1 if y2 > y1 else (-1 if y2 < y1 else 0)

                if dy > 0:
                    dx, dy = -dx, -dy

                nx, ny = x + dx, y + dy

                if ny < y and is_on_segment(nx, ny, x1, y1, x2, y2):
                    if energy > 0:
                        x, y = nx, ny
                        energy -= 1
                        moved = True
                        break
                    else:
                        print(x, y)
                        return

            if not moved:
                x, y = get_next_slide_below(x, y)
        else:
            x, y = get_next_slide_below(x, y)

    print(x, y)

solve()
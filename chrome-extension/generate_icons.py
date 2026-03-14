"""
Icon Generator Script for Chrome Extension
Generates PNG icons in required sizes: 16x16, 48x48, 128x128

Requirements: pip install pillow

Run: python generate_icons.py
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
except ImportError:
    print("Please install Pillow: pip install pillow")
    exit(1)

def create_icon(size):
    """Create a simple icon with gradient background and plug symbol"""
    # Create image with RGBA mode for transparency
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Create gradient background (purple to blue)
    for y in range(size):
        r = int(102 + (118 - 102) * y / size)
        g = int(126 + (75 - 126) * y / size)
        b = int(234 + (162 - 234) * y / size)
        draw.line([(0, y), (size, y)], fill=(r, g, b, 255))
    
    # Draw plug icon (simplified)
    center_x, center_y = size // 2, size // 2
    scale = size / 48
    
    # Socket circle (white outline)
    circle_radius = int(10 * scale)
    line_width = max(1, int(size / 16))
    draw.ellipse(
        [center_x - circle_radius, center_y - circle_radius,
         center_x + circle_radius, center_y + circle_radius],
        outline='white',
        width=line_width
    )
    
    # Plug pins (top)
    pin_width = max(2, int(3 * scale))
    pin_height = int(8 * scale)
    pin_y_start = center_y - int(16 * scale)
    
    # Left pin
    draw.rectangle(
        [center_x - int(6 * scale), pin_y_start,
         center_x - int(6 * scale) + pin_width, pin_y_start + pin_height],
        fill='white'
    )
    
    # Right pin
    draw.rectangle(
        [center_x + int(3 * scale), pin_y_start,
         center_x + int(3 * scale) + pin_width, pin_y_start + pin_height],
        fill='white'
    )
    
    # Signal waves (left side)
    wave_points_left = [
        (center_x - int(12 * scale), center_y),
        (center_x - int(10 * scale), center_y - int(3 * scale)),
        (center_x - int(8 * scale), center_y),
    ]
    draw.line(wave_points_left, fill='white', width=line_width)
    
    # Signal waves (right side)
    wave_points_right = [
        (center_x + int(8 * scale), center_y),
        (center_x + int(10 * scale), center_y - int(3 * scale)),
        (center_x + int(12 * scale), center_y),
    ]
    draw.line(wave_points_right, fill='white', width=line_width)
    
    return img

def main():
    # Create icons directory if it doesn't exist
    icons_dir = 'icons'
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
    
    # Generate icons in required sizes
    sizes = [16, 48, 128]
    
    for size in sizes:
        print(f"Generating {size}x{size} icon...")
        icon = create_icon(size)
        icon.save(f'{icons_dir}/icon{size}.png', 'PNG')
        print(f"  ✓ Saved: {icons_dir}/icon{size}.png")
    
    print("\n✅ All icons generated successfully!")
    print(f"Icons saved in: {os.path.abspath(icons_dir)}/")

if __name__ == '__main__':
    main()

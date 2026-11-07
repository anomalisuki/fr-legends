# Livery Code Format Summary

## What is a Livery Code?

A **livery code** is a 36-character hexadecimal string (18 bytes) that encodes a single shape in the FRL (FR Legends) format. Instead of manually drawing or pixel-painting designs, livery codes allow you to represent visual elements programmatically as structured binary data.

Each livery code defines:

- **Shape type** (e.g., square, circle)
- **Position** on the canvas (X, Y coordinates)
- **Size** (scale width and height)
- **Rotation** (angle in degrees)
- **Color** (RGB)
- **Opacity** (transparency level)
- **Blend mode** (how the shape blends with layers below)
- **Mirror modes** (horizontal, vertical, or both)
- **MipMap filtering** (groups only, for anti-aliasing)
- **Visibility** (shown or hidden)

## Livery Code Structure (36 Hex Characters)

A livery code has this exact format:

``` text
AABBCCCCDDDDEEEEFFFFGGGGHHHHIIJJKKLL
```

### Byte-by-Byte Breakdown

| Hex Chars | Field | Type | Range | Example | Description |
|-----------|-------|------|-------|---------|-------------|
| AA BB | Shape Type | uint16 | 0001–FFFF | 0002 | Shape identifier (0002 = square, FFFF = group) |
| CC CC | Position X | int16 | -32768–32767 | 0000 | X coordinate (signed) |
| DD DD | Position Y | int16 | -32768–32767 | 0000 | Y coordinate (signed) |
| EE EE | Scale X | int16 | -32768–32767 | 0064 | Width (negative = horizontal flip) |
| FF FF | Scale Y | int16 | -32768–32767 | 0064 | Height (negative = vertical flip) |
| GG GG | Rotation | int16 | -32768–32767 | 0000 | Rotation in degrees (normalizes to 0–359°) |
| HH HH HH | Color RGB | 24-bit | 000000–FFFFFF | FFFFFF | 24-bit RGB color |
| II | Opacity | uint8 | 00–FF | FF | Alpha transparency (FF = opaque, 00 = transparent) |
| JJ | Blend Mode | uint8 | 00–07 | 00 | Blending mode (0=Normal, 1=Add, 2=Soft Add, etc.) |
| KK LL | Visibility + Mirror + MIP | uint8 | 00–0F | 01 | See table below |

### Visibility + Mirror + MIP Encoding (Last 2 Hex Characters)

The last byte encodes visibility, mirroring, and MipMap filtering as a single value:

| Code | Binary | Visibility | H-Mirror | V-Mirror | MIP | Description |
|------|--------|-----------|----------|----------|-----|-------------|
| 01 | 0001 | ✅ Visible | ❌ No | ❌ No | ❌ No | No mirroring, no mip |
| 00 | 0000 | ❌ Hidden | ❌ No | ❌ No | ❌ No | No mirroring, no mip |
| 03 | 0011 | ✅ Visible | ✅ Yes | ❌ No | ❌ No | H-mirror only |
| 02 | 0010 | ❌ Hidden | ✅ Yes | ❌ No | ❌ No | H-mirror only |
| 05 | 0101 | ✅ Visible | ❌ No | ✅ Yes | ❌ No | V-mirror only |
| 04 | 0100 | ❌ Hidden | ❌ No | ✅ Yes | ❌ No | V-mirror only |
| 07 | 0111 | ✅ Visible | ✅ Yes | ✅ Yes | ❌ No | Both H and V mirrors |
| 06 | 0110 | ❌ Hidden | ✅ Yes | ✅ Yes | ❌ No | Both H and V mirrors |
| 09 | 1001 | ✅ Visible | ❌ No | ❌ No | ✅ **MIP** | MIP enabled (groups only) |
| 08 | 1000 | ❌ Hidden | ❌ No | ❌ No | ✅ **MIP** | MIP enabled (groups only) |
| 0B | 1011 | ✅ Visible | ✅ Yes | ❌ No | ✅ **MIP** | H-mirror + MIP (groups only) |
| 0A | 1010 | ❌ Hidden | ✅ Yes | ❌ No | ✅ **MIP** | H-mirror + MIP (groups only) |
| 0D | 1101 | ✅ Visible | ❌ No | ✅ Yes | ✅ **MIP** | V-mirror + MIP (groups only) |
| 0C | 1100 | ❌ Hidden | ❌ No | ✅ Yes | ✅ **MIP** | V-mirror + MIP (groups only) |
| 0F | 1111 | ✅ Visible | ✅ Yes | ✅ Yes | ✅ **MIP** | Both mirrors + MIP (groups only) |
| 0E | 1110 | ❌ Hidden | ✅ Yes | ✅ Yes | ✅ **MIP** | Both mirrors + MIP (groups only) |

**Key insights:**

- **Odd codes (01, 03, 05, 07, 09, 0B, 0D, 0F)** = visible
- **Even codes (00, 02, 04, 06, 08, 0A, 0C, 0E)** = hidden
- **Codes 08–0F** = MIP enabled (groups only, no effect on regular shapes)

## Complete Livery Code Example

``` text
000202000000006400640000FFFFFFFF0001
├─ 0002      = Shape type: square
├─ 0200      = Position X: 512 (0x0200 = 512 in decimal)
├─ 0000      = Position Y: 0
├─ 0064      = Scale X: 100 (0x0064 = 100 in decimal)
├─ 0064      = Scale Y: 100
├─ 0000      = Rotation: 0° (no rotation)
├─ FFFFFF    = Color: white (RGB 255,255,255)
├─ FF        = Opacity: fully opaque (255)
├─ 00        = Blend Mode: Normal (0)
└─ 01        = Visibility + Mirror + MIP: visible, no mirror, no mip
```

This represents a **100×100 white square** positioned at coordinates (512, 0) on the canvas with no rotation.

## Why "Livery Code" Instead of "Hex"?

While livery codes are indeed stored as **hexadecimal strings**, the term "hex" is misleading because:

1. **Hex is just encoding** — It's how the binary data is represented as text
2. **Livery code is the format** — It's the actual structured data that FRL understands
3. **Context matters** — In racing games, "livery" refers to paint jobs and visual designs

Using "livery code" is more precise and communicates that these are **FRL shape definitions for liveries**, not just generic hexadecimal data.

## Generation Workflow

When the AI image-to-livery generator processes an image:

1. **Image Analysis** → Detect brightness, edges, and colors
2. **Grid Sampling** → Divide image into cells
3. **Shape Generation** → Create squares from bright/dark cells
4. **Livery Code Encoding** → Convert each square to a 36-character livery code
5. **Output** → Array of livery codes ready for import into FR Legends

Each generated shape becomes a single livery code string that can be:

- **Copied and pasted** into FR Legends
- **Stacked** with other livery codes (up to 1500+ layers)
- **Mixed** with manually-created designs
- **Exported** for sharing or archival

## Layer Limits and Optimization

- **Default limit:** 1500 layers per livery
- **Each layer** = 1 livery code (1 shape)
- **Optimization:** If image sampling produces too many shapes, the grid cell size automatically increases until the layer count is within limits
- **Uncapped mode:** Can generate >1500 layers if explicitly enabled

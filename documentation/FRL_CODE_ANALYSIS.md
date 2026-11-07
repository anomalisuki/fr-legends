# FRL Code Analysis Documentation

## Table of Contents

- [Overview](#overview)
- [Livery Code Structure](#livery-code-structure)
  - [Hex Field Breakdown](#hex-field-breakdown)
- [Field Definitions & Examples](#field-definitions--examples)
  - [Shape Type](#shape-type)
  - [Position (X, Y)](#position-x-y)
    - [Position Encoding](#position-encoding)
    - [Position Examples](#position-examples)
  - [Scale (X, Y)](#scale-x-y)
    - [Scale Encoding](#scale-encoding-signed-16-bit-with-flip)
    - [Scale Examples (Positive)](#scale-examples-positive)
    - [Scale Examples (Negative – Flipping)](#scale-examples-negative--flipping)
  - [Rotation](#rotation)
    - [Rotation Encoding](#rotation-encoding)
    - [Rotation Value Reference](#rotation-value-reference)
    - [Rotation Examples](#rotation-examples)
  - [Color Format](#color-format)
    - [Color Examples](#color-examples)
    - [Color Value Reference](#color-value-reference)
    - [Color Test Canvas](#color-test-canvas)
  - [Opacity](#opacity)
    - [Opacity Examples](#opacity-examples)
    - [Opacity Value Reference](#opacity-value-reference)
  - [Blend Mode](#blend-mode)
    - [Blend Mode Examples](#blend-mode-examples)
    - [Blend Mode Reference](#blend-mode-reference)
    - [Blend Mode Test Canvas](#blend-mode-test-canvas)
  - [Visibility, Mirror & MIP](#visibility-mirror--mip)
    - [Visibility + Mirror + MIP Bit Pattern Table](#visibility--mirror--mip-bit-pattern-table)
    - [Visibility & Mirror Test Canvas](#visibility--mirror-test-canvas)
    - [Encoding Logic Examples](#encoding-logic-examples)
    - [MIP/MipMap Feature](#mipmipmap-feature-groups-only)
    - [Visual Comparison](#visual-comparison-visible-vs-hidden-mirrors)
- [Group/Canvas Structure](#groupcanvas-structure)
- [Best Practices](#best-practices)

---

## Overview

FR Legends livery code shapes are positioned on a **signed 16-bit coordinate system** (-32768 to 32767). The format supports efficient shape definitions with built-in mirror modes for instant symmetry without code duplication.

## Livery Code Structure

Each shape definition is **36 hexadecimal characters** (18 bytes) organized sequentially in this order:

``` text
AABBCCCCDDDDEEEEFFFFGGGGHHHHIIJJKKLL
AA BB           = Shape type (chars 0–3)
CC CC           = Position X (chars 4–7)
DD DD           = Position Y (chars 8–11)
EE EE           = Scale X (chars 12–15)
FF FF           = Scale Y (chars 16–19)
GG GG           = Rotation (chars 20–23)
HH HH HH        = Color RRGGBB (chars 24–29)
II              = Opacity (chars 30–31)
JJ              = Blend Mode (chars 32–33)
KK LL           = Mirror + Visibility + MIP (chars 34–35)
```

### Hex Field Breakdown

Breaking down the default example `000200000000006400640000FFFFFFFF0001`:

| Char Range | Field Name | Hex Value | Type | Value | Description |
|---|---|---|---|---|---|
| 0–3 | Shape Type | `0002` | uint16 | Square | Shape identifier |
| 4–7 | Position X | `0000` | int16 | 0 | X coordinate |
| 8–11 | Position Y | `0000` | int16 | 0 | Y coordinate |
| 12–15 | Scale X | `0064` | int16 | 100 | Width (pixels) |
| 16–19 | Scale Y | `0064` | int16 | 100 | Height (pixels) |
| 20–23 | Rotation | `0000` | int16 | 0° | Rotation in degrees |
| 24–29 | Color RGB | `FFFFFF` | RRGGBB | White | 24-bit RGB color |
| 30–31 | Opacity | `FF` | uint8 | 255 (100%) | Alpha transparency |
| 32–33 | Blend Mode | `00` | uint8 | 00 (Normal) | Blending mode selector |
| 34–35 | Mirror + Visibility + MIP | `01` | uint8 | Visible, no mirror | Visibility & symmetry flags |

---

## Field Definitions & Examples

### Shape Type

- **Location:** Characters 0–3
- **Type:** uint16 (unsigned 16-bit)
- **Example:** `0002` (square)
- **Range:** `0001`–`FFFF`
- **Description:** Identifier for the shape type. Common value: `0002` for squares.

### Position (X, Y)

- **Location:** Characters 4–11
  - Position X: Characters 4–7
  - Position Y: Characters 8–11
- **Type:** int16 (signed 16-bit)
- **Range:** -32768 to 32767
- **Examples:**
  - `0000` = 0 (center/origin)
  - `0200` = 512 (right/down)
  - `FE00` = -512 (left/up, two's complement)
- **Description:** Canvas coordinates. Negative values move left/up, positive move right/down.

#### Position Encoding

Positions use **signed 16-bit integers**, supporting both positive and negative coordinates:

| Hex Value | Decimal | Description |
|-----------|---------|-------------|
| `0x0000` | 0 | Center origin |
| `0x00B0` | 176 | Small right/down offset |
| `0x0200` | 512 | Standard right/down |
| `0x0380` | 896 | Large right/down |
| `0xFED1` | -303 | Small left/up (negative) |
| `0xFE00` | -512 | Standard left/up |
| `0xFC80` | -896 | Large left/up |

#### Position Examples

Test canvas with 6 squares at different positions:

``` text
FFFF00000000001400140000FFFFFFFF0001
<
    000200000000006400640000FFFFFFFF0001
    000202000000006400640000FFFFFFFF0001
    000202000200006400640000FFFFFFFF0001
    0002FE000000006400640000FFFFFFFF0001
    0002FE00FE00006400640000FFFFFFFF0001
    000203800380006400640000FFFFFFFF0001
>
```

| # | Code | Pos X | Pos Y | Sca X | Sca Y | Rot | Color | Opacity | Blend | Visibility | Description |
|---|------|-------|-------|-------|-------|-----|-------|---------|-------|-----------|-------------|
| 1 | `000200000000006400640000FFFFFFFF0001` | 0000 | 0000 | 0064 | 0064 | 0000 | FFFFFF | FF | FF | 01 | 0, 0 → 100×100 |
| 2 | `000202000000006400640000FFFFFFFF0001` | 0200 | 0000 | 0064 | 0064 | 0000 | FFFFFF | FF | FF | 01 | 512, 0 → 100×100 |
| 3 | `000202000200006400640000FFFFFFFF0001` | 0200 | 0200 | 0064 | 0064 | 0000 | FFFFFF | FF | FF | 01 | 512, 512 → 100×100 |
| 4 | `0002FE000000006400640000FFFFFFFF0001` | FE00 | 0000 | 0064 | 0064 | 0000 | FFFFFF | FF | FF | 01 | -512, 0 → 100×100 |
| 5 | `0002FE00FE00006400640000FFFFFFFF0001` | FE00 | FE00 | 0064 | 0064 | 0000 | FFFFFF | FF | FF | 01 | -512, -512 → 100×100 |
| 6 | `000203800380006400640000FFFFFFFF0001` | 0380 | 0380 | 0064 | 0064 | 0000 | FFFFFF | FF | FF | 01 | 896, 896 → 100×100 |

![Position Test Reference](./ref/position.png)

### Scale (X, Y)

- **Location:** Characters 12–19
  - Scale X: Characters 12–15
  - Scale Y: Characters 16–19
- **Type:** int16 (signed 16-bit)
- **Range:** -32768 to 32767
- **Positive values:** Normal scale (size in pixels)
- **Negative values:** Flipped scale (same size, but mirrored)
- **Examples:**
  - `0064` = 100 pixels (normal)
  - `FF9C` = -100 pixels (flipped)
- **Description:** Shape dimensions. Negative scales flip the shape horizontally or vertically.

#### Scale Encoding (Signed 16-bit with Flip)

Scale values represent the width (Scale X) and height (Scale Y) of shapes in pixels. Using **signed 16-bit integers** allows both positive and negative values:

- **Positive values:** Normal scale (1 to 32767 pixels)
- **Negative values:** Flipped scale (same size, but horizontally or vertically flipped)

**Flipping Behavior:**

- **Negative Scale X:** Flips shape horizontally (left-right mirror)
- **Negative Scale Y:** Flips shape vertically (top-bottom mirror)
- **Both negative:** Flips both horizontally and vertically (180° flip)

##### Scale Examples (Positive)

Test canvas with 10 squares at varying positive scales:

``` text
FFFF00000000001400140000FFFFFFFF0001
<
    0002FCB10000003200320000FFFFFFFF0001
    0002FE0D0000004B004B0000FFFFFFFF0001
    0002FF880000006400640000FFFFFFFF0001
    000201280000007D007D0000FFFFFFFF0001
    0002030A0000009600960000FFFFFFFF0001
    00020275028500C800C80000FFFFFFFF0001
    0002FE7C026E00FA00FA0000FFFFFFFF0001
    0002FDE9FDC2012C012C0000FFFFFFFF0001
    000200ECFD38008800530000FFFFFFFF0001
    000202F9FDAE004200850000FFFFFFFF0001
>
```

| # | Code | Pos X | Pos Y | Sca X | Sca Y | Rot | Color | Opacity | Blend | Visibility | Description |
|---|------|-------|-------|-------|-------|-----|-------|---------|-------|-----------|-------------|
| 1 | `0002FCB10000003200320000FFFFFFFF0001` | FCB1 | 0000 | 0032 | 0032 | 0000 | FFFFFF | FF | FF | 01 | −847, 0 → 50×50 |
| 2 | `0002FE0D0000004B004B0000FFFFFFFF0001` | FE0D | 0000 | 004B | 004B | 0000 | FFFFFF | FF | FF | 01 | −499, 0 → 75×75 |
| 3 | `0002FF880000006400640000FFFFFFFF0001` | FF88 | 0000 | 0064 | 0064 | 0000 | FFFFFF | FF | FF | 01 | −120, 0 → 100×100 |
| 4 | `000201280000007D007D0000FFFFFFFF0001` | 0128 | 0000 | 007D | 007D | 0000 | FFFFFF | FF | FF | 01 | 296, 0 → 125×125 |
| 5 | `0002030A0000009600960000FFFFFFFF0001` | 030A | 0000 | 0096 | 0096 | 0000 | FFFFFF | FF | FF | 01 | 778, 0 → 150×150 |
| 6 | `00020275028500C800C80000FFFFFFFF0001` | 0275 | 0285 | 00C8 | 00C8 | 0000 | FFFFFF | FF | FF | 01 | 629, 645 → 200×200 |
| 7 | `0002FE7C026E00FA00FA0000FFFFFFFF0001` | FE7C | 026E | 00FA | 00FA | 0000 | FFFFFF | FF | FF | 01 | −388, 622 → 250×250 |
| 8 | `0002FDE9FDC2012C012C0000FFFFFFFF0001` | FDE9 | FDC2 | 012C | 012C | 0000 | FFFFFF | FF | FF | 01 | −535, −574 → 300×300 |
| 9 | `000200ECFD38008800530000FFFFFFFF0001` | 00EC | FD38 | 0088 | 0053 | 0000 | FFFFFF | FF | FF | 01 | 236, −712 → 136×83 |
| 10 | `000202F9FDAE004200850000FFFFFFFF0001` | 02F9 | FDAE | 0042 | 0085 | 0000 | FFFFFF | FF | FF | 01 | 761, −594 → 66×163 |

![Scale Test Reference](./ref/scale.png)

##### Scale Examples (Negative – Flipping)

Test canvas with same squares at negative scales (flipped):

``` text
FFFF00000000001400140000FFFFFFFF0001
<
    0002FCB10000FFCEFFCE0000FFFFFFFF0001
    0002FE0D0000FFB5FFB50000FFFFFFFF0001
    0002FF880000FF9CFF9C0000FFFFFFFF0001
    000201280000FF83FF830000FFFFFFFF0001
    0002030A0000FF6AFF6A0000FFFFFFFF0001
    000202750285FF38FF380000FFFFFFFF0001
    0002FE7C026EFF06FF060000FFFFFFFF0001
    0002FDE9FDC2FED4FED40000FFFFFFFF0001
    000200ECFD38FF78FFAD0000FFFFFFFF0001
    000202F9FDAEFFBEFF7B0000FFFFFFFF0001
>
```

| # | Code | Pos X | Pos Y | Sca X | Sca Y | Rot | Color | Opacity | Blend | Visibility | Effect |
|---|------|-------|-------|-------|-------|-----|-------|---------|-------|-----------|--------|
| 1 | `0002FCB10000FFCEFFCE0000FFFFFFFF0001` | FCB1 | 0000 | FFCE | FFCE | 0000 | FFFFFF | FF | FF | 01 | H-flip & V-flip 50×50 |
| 2 | `0002FE0D0000FFB5FFB50000FFFFFFFF0001` | FE0D | 0000 | FFB5 | FFB5 | 0000 | FFFFFF | FF | FF | 01 | H-flip & V-flip 75×75 |
| 3 | `0002FF880000FF9CFF9C0000FFFFFFFF0001` | FF88 | 0000 | FF9C | FF9C | 0000 | FFFFFF | FF | FF | 01 | H-flip & V-flip 100×100 |
| 4 | `000201280000FF83FF830000FFFFFFFF0001` | 0128 | 0000 | FF83 | FF83 | 0000 | FFFFFF | FF | FF | 01 | H-flip & V-flip 125×125 |
| 5 | `0002030A0000FF6AFF6A0000FFFFFFFF0001` | 030A | 0000 | FF6A | FF6A | 0000 | FFFFFF | FF | FF | 01 | H-flip & V-flip 150×150 |
| 6 | `000202750285FF38FF380000FFFFFFFF0001` | 0275 | 0285 | FF38 | FF38 | 0000 | FFFFFF | FF | FF | 01 | H-flip & V-flip 200×200 |
| 7 | `0002FE7C026EFF06FF060000FFFFFFFF0001` | FE7C | 026E | FF06 | FF06 | 0000 | FFFFFF | FF | FF | 01 | H-flip & V-flip 250×250 |
| 8 | `0002FDE9FDC2FED4FED40000FFFFFFFF0001` | FDE9 | FDC2 | FED4 | FED4 | 0000 | FFFFFF | FF | FF | 01 | H-flip & V-flip 300×300 |
| 9 | `000200ECFD38FF78FFAD0000FFFFFFFF0001` | 00EC | FD38 | FF78 | FFAD | 0000 | FFFFFF | FF | FF | 01 | H-flip 136, V-flip -83 |
| 10 | `000202F9FDAEFFBEFF7B0000FFFFFFFF0001` | 02F9 | FDAE | FFBE | FF7B | 0000 | FFFFFF | FF | FF | 01 | H-flip 66, V-flip -123 |

**Negative Scale Encoding:**

| Size | Positive Hex | Decimal | Negative Hex | Signed int16 | Visual Effect |
|------|---|---|---|---|---|
| 50 | `0032` | 50 | `FFCE` | -50 | Flipped horizontally & vertically |
| 100 | `0064` | 100 | `FF9C` | -100 | Flipped horizontally & vertically |
| 150 | `0096` | 150 | `FF6A` | -150 | Flipped horizontally & vertically |
| 300 | `012C` | 300 | `FED4` | -300 | Flipped horizontally & vertically |

### Rotation

- **Location:** Characters 20–23
- **Type:** int16 (signed 16-bit)
- **Range:** -32768 to 32767 degrees
- **Wrap-around:** Normalizes to 0–359° (e.g., -286° → 74°, 816° → 96°)
- **Examples:**
  - `0000` = 0° (no rotation)
  - `002D` = 45°
  - `005A` = 90°
  - `00B4` = 180°
  - `FEE2` = -286° (normalized to 74°)
- **Description:** Clockwise rotation in degrees. Directly maps to angle.

#### Rotation Encoding

Rotation is stored as a **16-bit signed integer** (int16, range -32768 to 32767) in characters 20–23. Values represent degrees directly, with automatic wrap-around for values outside 0–359°.

**Key Properties:**

- **Encoding:** Signed 16-bit integer (int16)
- **Range:** -32768 to 32767 degrees
- **Wrap-around:** Values normalize to 0–359° (e.g., -286° → 74°, 816° → 96°)
- **Direct mapping:** Hex value converts directly to degrees (no scaling formula)

**Normalization Formula:**

``` text
Final_Rotation = Rotation_Value mod 360
If negative: Final_Rotation = Rotation_Value + 360
```

#### Rotation Value Reference

| Rotation | Hex Value | Decimal | Signed Int16 | Normalized | Description |
|----------|-----------|---------|---|---|-------------|
| 0° | `0000` | 0 | 0 | 0° | No rotation |
| 45° | `002D` | 45 | 45 | 45° | Direct degree mapping |
| 56° | `0038` | 56 | 56 | 56° | Direct degree mapping |
| 74° | `004A` | 74 | 74 | 74° | Direct degree mapping |
| 90° | `005A` | 90 | 90 | 90° | Direct degree mapping |
| 137° | `0089` | 137 | 137 | 137° | Direct degree mapping |
| 180° | `00B4` | 180 | 180 | 180° | Direct degree mapping |
| -286° | `FEE2` | 65250 | -286 | 74° | Negative wrap-around (360-286) |
| 816° | `0330` | 816 | 816 | 96° | Positive wrap-around (816 mod 360) |

#### Rotation Examples

Test canvas with rotated squares and rectangles:

``` text
FFFF00000000001400140000FFFFFFFF0001
<
    0002FCD70000006400640000FFFFFFFF0001
    0002FE69000000640064002DFFFFFFFF0001
    00020005000000640064005AFFFFFFFF0001
    0002FD3E021F008F00480000FFFFFFFF0001
    0002FD59031F008F004800B4FFFFFFFF0001
    0002FF8801D4008F00480038FFFFFFFF0001
    0002014901B6008F00480089FFFFFFFF0001
>
```

| # | Code | Pos X | Pos Y | Sca X | Sca Y | Rot | Color | Opacity | Blend | Visibility | Description |
|---|------|-------|-------|-------|-------|-----|-------|---------|-------|-----------|-------------|
| 1 | `0002FCD70000006400640000FFFFFFFF0001` | FCD7 | 0000 | 0064 | 0064 | 0000 | FFFFFF | FF | FF | 01 | −809, 0 → 100×100 → 0° |
| 2 | `0002FE69000000640064002DFFFFFFFF0001` | FE69 | 0000 | 0064 | 0064 | 002D | FFFFFF | FF | FF | 01 | −407, 0 → 100×100 → 45° |
| 3 | `00020005000000640064005AFFFFFFFF0001` | 0005 | 0000 | 0064 | 0064 | 005A | FFFFFF | FF | FF | 01 | 5, 0 → 100×100 → 90° |
| 4 | `0002FD3E021F008F00480000FFFFFFFF0001` | FD3E | 021F | 008F | 0048 | 0000 | FFFFFF | FF | FF | 01 | −706, 543 → 143×72 → 0° |
| 5 | `0002FD59031F008F004800B4FFFFFFFF0001` | FD59 | 031F | 008F | 0048 | 00B4 | FFFFFF | FF | FF | 01 | −679, 799 → 143×72 → 180° |
| 6 | `0002FF8801D4008F00480038FFFFFFFF0001` | FF88 | 01D4 | 008F | 0048 | 0038 | FFFFFF | FF | FF | 01 | −120, 468 → 143×72 → 56° |
| 7 | `0002014901B6008F00480089FFFFFFFF0001` | 0149 | 01B6 | 008F | 0048 | 0089 | FFFFFF | FF | FF | 01 | 329, 438 → 143×72 → 137° |

**Rotation Decoding Example (Row 7 – Positive Rotation):**

- Hex: `0002014901B6008F00480089FFFFFFFF0001`
- Position X: `0149` = 329
- Position Y: `01B6` = 438
- Scale X: `008F` = 143
- Scale Y: `0048` = 72
- **Rotation: `0089` = 137°**
- Color: `FFFFFF` (white)
- Opacity: `FF` (100%)
- Blend: `FF` (normal)
- Mirror: `01` (visible, no mirror)

Result: White rectangle at (329, 438), size 143×72, rotated 137°

**Rotation Decoding Example (Row 8 – Negative Rotation):**

- Hex: `0002014901B6008F0048FEE2FFFFFFFF0001`
- Position X: `0149` = 329
- Position Y: `01B6` = 438
- Scale X: `008F` = 143
- Scale Y: `0048` = 72
- **Rotation: `FEE2` = -286° (signed int16)**
- **Normalized: -286° + 360° = 74°**
- Color: `FFFFFF` (white)
- Opacity: `FF` (100%)
- Blend: `FF` (normal)
- Mirror: `01` (visible, no mirror)

Result: White rectangle at (329, 438), size 143×72, rotated -286° (visually equivalent to 74°)

![Rotation Test Reference](./ref/rotation.png)

**Encoding Notes:**

- **Positive rotations:** Stored directly (0–32767°, normalized to 0–359°)
- **Negative rotations:** Stored as signed int16 (-32768 to -1°), normalized to equivalent positive angles
- **Wrap-around:** All values automatically normalize to 0–359° range during rendering

### Color Format

- **Location:** Characters 24–29
- **Type:** RRGGBB (24-bit RGB)
- **Range:** `000000`–`FFFFFF`
- **Examples:**
  - `FF0000` = Red
  - `00FF00` = Green
  - `0000FF` = Blue
  - `FFFFFF` = White
  - `4390B5` = Custom teal
- **Description:** 24-bit color in hexadecimal (Red-Green-Blue).

#### Color Examples

Colors use **24-bit RGB** in hexadecimal (RRGGBB) stored in characters 24–29. All 16.7 million colors are supported.

#### Color Value Reference

| Color | Hex Value | Description |
|-------|-----------|-------------|
| Red | `FF0000` | Full red (255, 0, 0) |
| Green | `00FF00` | Full green (0, 255, 0) |
| Blue | `0000FF` | Full blue (0, 0, 255) |
| Yellow | `FFFF00` | Red + Green (255, 255, 0) |
| Cyan | `00FFFF` | Green + Blue (0, 255, 255) |
| Magenta/Pink | `FF00FF` | Red + Blue (255, 0, 255) |
| White | `FFFFFF` | All colors (255, 255, 255) |
| Black | `000000` | No color (0, 0, 0) |
| Custom | `4390B5` | Teal blue example |

#### Color Test Canvas

Test canvas with 9 colored squares:

``` text
FFFF00000000001400140000FFFFFFFF0001
<
    0002FE000000006400640000FF0000FF0001
    00020000000000640064000000FF00FF0001
    0002020000000064006400000000FFFF0001
    0002FE00FE00006400640000FFFF00FF0001
    00020000FE00006400640000FF00FFFF0001
    00020200FE0000640064000000FFFFFF0001
    0002FE0002000064006400004390B5FF0001
    000200000200006400640000963776CE0001
    000202000200006400640000BAB2894B0001
>
```

| # | Code | Pos X | Pos Y | Sca X | Sca Y | Rot | Color | Opacity | Blend | Visibility | Description |
|---|------|-------|-------|-------|-------|-----|-------|---------|-------|-----------|-------------|
| 1 | `0002FE000000006400640000FF0000FF0001` | FE00 | 0000 | 0064 | 0064 | 0000 | FF0000 | FF | FF | 01 | Red, fully opaque |
| 2 | `00020000000000640064000000FF00FF0001` | 0000 | 0000 | 0064 | 0064 | 0000 | 00FF00 | FF | FF | 01 | Green, fully opaque |
| 3 | `0002020000000064006400000000FFFF0001` | 0200 | 0000 | 0064 | 0064 | 0000 | 0000FF | FF | FF | 01 | Blue, fully opaque |
| 4 | `0002FE00FE00006400640000FFFF00FF0001` | FE00 | FE00 | 0064 | 0064 | 0000 | FFFF00 | FF | FF | 01 | Yellow, fully opaque |
| 5 | `00020000FE00006400640000FF00FFFF0001` | 0000 | FE00 | 0064 | 0064 | 0000 | FF00FF | FF | FF | 01 | Magenta, fully opaque |
| 6 | `00020200FE0000640064000000FFFFFF0001` | 0200 | FE00 | 0064 | 0064 | 0000 | 00FFFF | FF | FF | 01 | Cyan, fully opaque |
| 7 | `0002FE0002000064006400004390B5FF0001` | FE00 | 0200 | 0064 | 0064 | 0000 | 4390B5 | FF | FF | 01 | Custom teal, fully opaque |
| 8 | `000200000200006400640000963776CE0001` | 0000 | 0200 | 0064 | 0064 | 0000 | 963776 | CE | FF | 01 | Custom mauve, ~80% opacity |
| 9 | `000202000200006400640000BAB2894B0001` | 0200 | 0200 | 0064 | 0064 | 0000 | BAB289 | 4B | FF | 01 | Custom tan, ~29% opacity |

![Color Blends Test Reference](./ref/colorblends.png)

### Opacity

- **Location:** Characters 30–31
- **Type:** uint8 (unsigned 8-bit)
- **Range:** `00`–`FF` (0–255)
- **Examples:**
  - `00` = 0% (fully transparent)
  - `80` = 50% (semi-transparent)
  - `FF` = 100% (fully opaque)
- **Description:** Alpha transparency channel.

#### Opacity Examples

Opacity (alpha transparency) is stored as an **unsigned 8-bit integer** in characters 30–31 with values from 0–255.

#### Opacity Value Reference

| Opacity | Hex | Decimal | Percentage | Description |
|---------|-----|---------|------------|-------------|
| Transparent | `00` | 0 | 0% | Fully transparent (invisible) |
| 25% | `40` | 64 | 25% | Mostly transparent |
| 50% | `80` | 128 | 50% | Semi-transparent |
| 75% | `BF` | 191 | 75% | Mostly opaque |
| ~80% | `CE` | 206 | 81% | Custom opacity |
| ~29% | `4B` | 75 | 29% | Custom opacity |
| Opaque | `FF` | 255 | 100% | Fully opaque (no transparency) |

**Opacity Encoding Formula:**

``` text
Opacity_Percentage = (Opacity_Hex / 255) × 100
Opacity_Hex = (Opacity_Percentage / 100) × 255
```

### Blend Mode

- **Location:** Characters 32–33
- **Type:** uint8 (unsigned 8-bit, values 0–7)
- **Range:**
  - `00` = Normal
  - `01` = Add
  - `02` = Soft Add
  - `03` = Multiple
  - `04` = 2x Multiple
  - `05` = Lighter
  - `06` = Darker
  - `07` = Replace
- **Description:** Compositing mode for how the shape blends with background/layers.

#### Blend Mode Examples

Blend mode controls how a shape composites with the background and underlying layers. Stored in characters 32–33 as a value from 0–7.

#### Blend Mode Reference

| Mode # | Hex | Blend Mode | Description |
|--------|-----|-----------|-------------|
| 0 | `00` | Normal | Standard alpha blending (default) |
| 1 | `01` | Add | Additive blend (brightens background) |
| 2 | `02` | Soft Add | Additive blend with reduced intensity |
| 3 | `03` | Multiple | Multiplicative blend (darkens background) |
| 4 | `04` | 2x Multiple | Doubled multiplicative blend (stronger darkening) |
| 5 | `05` | Lighter | Keeps lighter pixels (max of RGB values) |
| 6 | `06` | Darker | Keeps darker pixels (min of RGB values) |
| 7 | `07` | Replace | Completely replaces background (ignores alpha) |

#### Blend Mode Test Canvas

Test canvas with 8 white squares at different blend modes:

``` text
FFFF00000000001400140000FFFFFFFF0001
<
    0002FC990352006400640000FFFFFFFF0001
    0002FDB30352006400640000FFFFFFFF0101
    0002FEC00352006400640000FFFFFFFF0201
    0002FFDE0352006400640000FFFFFFFF0301
    000200F90352006400640000FFFFFFFF0401
    000202170352006400640000FFFFFFFF0501
    000203520352006400640000FFFFFFFF0601
    00020352021D006400640000FFFFFFFF0701
>
```

| # | Code | Pos X | Pos Y | Sca X | Sca Y | Rot | Color | Opacity | Blend | Visibility | Visual Effect |
|---|------|-------|-------|-------|-------|-----|-------|---------|-------|-----------|-------------|
| 1 | `0002FC990352006400640000FFFFFFFF0001` | FC99 | 0352 | 0064 | 0064 | 0000 | FFFFFF | FF | 00 | 01 | Normal blending, respects alpha |
| 2 | `0002FDB30352006400640000FFFFFFFF0101` | FDB3 | 0352 | 0064 | 0064 | 0000 | FFFFFF | FF | 01 | 01 | Additive: brightens by adding RGB |
| 3 | `0002FEC00352006400640000FFFFFFFF0201` | FEC0 | 0352 | 0064 | 0064 | 0000 | FFFFFF | FF | 02 | 01 | Soft Add: reduced intensity |
| 4 | `0002FFDE0352006400640000FFFFFFFF0301` | FFDE | 0352 | 0064 | 0064 | 0000 | FFFFFF | FF | 03 | 01 | Multiple: darkens by RGB multiply |
| 5 | `000200F90352006400640000FFFFFFFF0401` | 00F9 | 0352 | 0064 | 0064 | 0000 | FFFFFF | FF | 04 | 01 | 2x Multiple: very dark effect |
| 6 | `000202170352006400640000FFFFFFFF0501` | 0217 | 0352 | 0064 | 0064 | 0000 | FFFFFF | FF | 05 | 01 | Lighter: max of RGB per channel |
| 7 | `000203520352006400640000FFFFFFFF0601` | 0352 | 0352 | 0064 | 0064 | 0000 | FFFFFF | FF | 06 | 01 | Darker: min of RGB per channel |
| 8 | `00020352021D006400640000FFFFFFFF0701` | 0352 | 021D | 0064 | 0064 | 0000 | FFFFFF | FF | 07 | 01 | Replace: completely replaces bg |

**Field Location Note:**

The blend mode selector occupies characters 32–33 of the 36-character code:

``` text
AABBCCCCDDDDEEEEFFFFGGGGHHHHIIJJKKLL
                              JJ    ← Blend mode (00-07)
                                LL  ← Visibility + Mirror + MIP
```

![Color Blends Test Reference](./ref/colorblends.png)

### Visibility, Mirror & MIP

- **Location:** Character 35 (last character)
- **Type:** uint8 (unsigned 8-bit, values 0–15)
- **Encoding:** Single byte with 4-bit pattern
  - **Bit 0 (LSB):** Visibility (1 = visible, 0 = hidden)
  - **Bit 1:** V-mirror flag (1 = v-mirror enabled)
  - **Bit 2:** H-mirror flag (1 = h-mirror enabled)
  - **Bit 3:** MIP/MipMap flag (1 = mip enabled, 0 = mip disabled) **[Groups only]**
- **Standard Values (0–7):**
  - `00` = Hidden, no mirrors, no mip
  - `01` = Visible, no mirrors, no mip
  - `02` = Hidden, H-mirror only, no mip
  - `03` = Visible, H-mirror only, no mip
  - `04` = Hidden, V-mirror only, no mip
  - `05` = Visible, V-mirror only, no mip
  - `06` = Hidden, both mirrors, no mi
  - `07` = Visible, both mirrors, no mip
- **MIP/MipMap Values (8–15, Groups Only):**
  - `08` = Hidden, no mirrors, **mip enabled**
  - `09` = Visible, no mirrors, **mip enabled**
  - `0A` = Hidden, H-mirror only, **mip enabled**
  - `0B` = Visible, H-mirror only, **mip enabled**
  - `0C` = Hidden, V-mirror only, **mip enabled**
  - `0D` = Visible, V-mirror only, **mip enabled**
  - `0E` = Hidden, both mirrors, **mip enabled**
  - `0F` = Visible, both mirrors, **mip enabled**
- **Description:** Controls shape visibility, automatic mirror duplication, and (for groups only) anti-aliasing via MipMap filtering.

#### Visibility + Mirror + MIP Bit Pattern Table

| Value | Hex | Binary | Visibility | H-Mirror | V-Mirror | MIP | Total Instances | Description |
|-------|-----|--------|-----------|----------|----------|-----|---------|-------------|
| 0 | `00` | 0000 | ❌ Hidden | ❌ No | ❌ No | ❌ No | 1 | Single hidden shape, no mip |
| 1 | `01` | 0001 | ✅ Visible | ❌ No | ❌ No | ❌ No | 1 | Single visible shape, no mip |
| 2 | `02` | 0010 | ❌ Hidden | ✅ Yes | ❌ No | ❌ No | 2 | Two hidden h-mirrored instances, no mip |
| 3 | `03` | 0011 | ✅ Visible | ✅ Yes | ❌ No | ❌ No | 2 | Two visible h-mirrored instances, no mip |
| 4 | `04` | 0100 | ❌ Hidden | ❌ No | ✅ Yes | ❌ No | 2 | Two hidden v-mirrored instances, no mip |
| 5 | `05` | 0101 | ✅ Visible | ❌ No | ✅ Yes | ❌ No | 2 | Two visible v-mirrored instances, no mip |
| 6 | `06` | 0110 | ❌ Hidden | ✅ Yes | ✅ Yes | ❌ No | 4 | Four hidden fully-mirrored instances, no mip |
| 7 | `07` | 0111 | ✅ Visible | ✅ Yes | ✅ Yes | ❌ No | 4 | Four visible fully-mirrored instances, no mip |
| 8 | `08` | 1000 | ❌ Hidden | ❌ No | ❌ No | ✅ **MIP** | 1 | Single hidden shape, **mip enabled** (groups only) |
| 9 | `09` | 1001 | ✅ Visible | ❌ No | ❌ No | ✅ **MIP** | 1 | Single visible shape, **mip enabled** (groups only) |
| 10 | `0A` | 1010 | ❌ Hidden | ✅ Yes | ❌ No | ✅ **MIP** | 2 | Two hidden h-mirrored instances, **mip enabled** (groups only) |
| 11 | `0B` | 1011 | ✅ Visible | ✅ Yes | ❌ No | ✅ **MIP** | 2 | Two visible h-mirrored instances, **mip enabled** (groups only) |
| 12 | `0C` | 1100 | ❌ Hidden | ❌ No | ✅ Yes | ✅ **MIP** | 2 | Two hidden v-mirrored instances, **mip enabled** (groups only) |
| 13 | `0D` | 1101 | ✅ Visible | ❌ No | ✅ Yes | ✅ **MIP** | 2 | Two visible v-mirrored instances, **mip enabled** (groups only) |
| 14 | `0E` | 1110 | ❌ Hidden | ✅ Yes | ✅ Yes | ✅ **MIP** | 4 | Four hidden fully-mirrored instances, **mip enabled** (groups only) |
| 15 | `0F` | 1111 | ✅ Visible | ✅ Yes | ✅ Yes | ✅ **MIP** | 4 | Four visible fully-mirrored instances, **mip enabled** (groups only) |

#### Visibility & Mirror Test Canvas

Test canvas demonstrating all 8 combinations with the same position and size:

``` text
FFFF00000000006400640000FFFFFFFF0001
<
    0002FE000000006400640000FFFFFFFF0001
    0002FE000000006400640000FFFFFFFF0000
    0002FE000000006400640000FFFFFFFF0003
    0002FE000000006400640000FFFFFFFF0002
    0002FE000000006400640000FFFFFFFF0005
    0002FE000000006400640000FFFFFFFF0004
    0002FE000000006400640000FFFFFFFF0007
    0002FE000000006400640000FFFFFFFF0006
>
```

| # | Hex Code | Last Char | Visibility | Mirror | Total Shapes | Visual Result |
|---|---|---|---|---|---|---|
| 1 | `...FFFFFFFF0001` | `01` | ✅ Visible | None | 1 | 1 white square at (-512, 0) |
| 2 | `...FFFFFFFF0000` | `00` | ❌ Hidden | None | 1 | No rendering (1 hidden shape) |
| 3 | `...FFFFFFFF0003` | `03` | ✅ Visible | H-mirror | 2 | 2 visible white squares (h-mirrored pair) |
| 4 | `...FFFFFFFF0002` | `02` | ❌ Hidden | H-mirror | 2 | No rendering (2 h-mirrored hidden shapes) |
| 5 | `...FFFFFFFF0005` | `05` | ✅ Visible | V-mirror | 2 | 2 visible white squares (v-mirrored pair) |
| 6 | `...FFFFFFFF0004` | `04` | ❌ Hidden | V-mirror | 2 | No rendering (2 v-mirrored hidden shapes) |
| 7 | `...FFFFFFFF0007` | `07` | ✅ Visible | Both | 4 | 4 visible white squares (full 4-way symmetry) |
| 8 | `...FFFFFFFF0006` | `06` | ❌ Hidden | Both | 4 | No rendering (4 fully-mirrored hidden shapes) |

#### Encoding Logic Examples

##### Example 1: Visible, No Mirror (01)

- Hex: `0002FE000000006400640000FFFFFFFF0001`
- Last char: `01` (binary 001)
  - Bit 0 = 1 → **VISIBLE**
  - Bit 1 = 0 → No V-mirror
  - Bit 2 = 0 → No H-mirror
- Result: **1 visible shape** at (-512, 0), 100×100, white

##### Example 2: Visible, H-Mirror Only (03)

- Hex: `0002FE000000006400640000FFFFFFFF0003`
- Last char: `03` (binary 011)
  - Bit 0 = 1 → **VISIBLE**
  - Bit 1 = 1 → **H-mirror enabled**
  - Bit 2 = 0 → No V-mirror
- Result: **2 visible shapes** at (-512, 0) with h-mirror symmetry (original + left-right mirror)

##### Example 3: Visible, Both Mirrors (07)

- Hex: `0002FE000000006400640000FFFFFFFF0007`
- Last char: `07` (binary 111)
  - Bit 0 = 1 → **VISIBLE**
  - Bit 1 = 1 → **H-mirror enabled**
  - Bit 2 = 1 → **V-mirror enabled**
- Result: **4 visible shapes** at (-512, 0) with full 4-way symmetry (all quadrants)

##### Example 4: Hidden, Both Mirrors (06)

- Hex: `0002FE79FEDF006400640000FFFFFFFF0006`
- Last char: `06` (binary 110)
  - Bit 0 = 0 → **HIDDEN**
  - Bit 1 = 1 → **H-mirror enabled**
  - Bit 2 = 1 → **V-mirror enabled**
- Result: **4 hidden shapes** (not rendered, but 4 mirrored instances calculated)
- **Use case:** Layout scaffolding, invisible guide shapes for alignment

#### MIP/MipMap Feature (Groups Only)

**MIP (MipMap) Filtering:**

- **Purpose:** Applies anti-aliasing to pixelated/rasterized group content, making sharp edges appear blurry/smooth
- **Availability:** Groups only (type `FFFF`). Has no effect on regular shapes
- **Encoding:** Bit 3 of the last byte (values `08`–`0F`)
- **Visual Effect:** Smooths pixelated group content for a polished appearance
- **Technical Note:** MipMap filtering reduces aliasing artifacts when groups are scaled or rotated
- **Use Cases:**
  - Smoothing rasterized sprite content in groups
  - Reducing aliasing artifacts on scaled group content
  - Creating polished visual effects while maintaining sharp edges on regular shapes

#### Why This Encoding is Elegant

1. **Single byte encodes 4 independent properties:** Visibility + H-mirror + V-mirror + MIP
2. **Binary bit logic:** Each property is a separate bit, allowing 16 total combinations (0–15)
3. **Natural odd/even pattern:** Visibility determined by LSB (bit 0)
4. **Space efficient:** Uses only 1 hex character instead of separate fields
5. **Mirrors work even when hidden:** Enables invisible guide shapes and layout scaffolding
6. **MIP extends standard encoding:** Values 8–15 add mip functionality without conflicting with standard values 0–7
7. **Selective feature:** MIP only affects groups, allowing precise control per shape type

#### Field Location

The visibility, mirror, and MIP encoding occupies the **last character** of the 36-character code:

``` text
AABBCCCCDDDDEEEEFFFFGGGGHHHHIIJJKKLL
                                    LL ← Visibility + Mirror + MIP (00-0F)
                                      = Binary: M HH VV V (M=mip, H=h-mirror, V=v-mirror, V=visibility)
                                      
Standard encoding (no mip):
01 = 0b0001 = visible, no mirrors, no mip
03 = 0b0011 = visible, h-mirror, no mip
05 = 0b0101 = visible, v-mirror, no mip
07 = 0b0111 = visible, both mirrors, no mip
00 = 0b0000 = hidden, no mirrors, no mip
02 = 0b0010 = hidden, h-mirror, no mip
04 = 0b0100 = hidden, v-mirror, no mip
06 = 0b0110 = hidden, both mirrors, no mip

MIP encoding (groups only):
09 = 0b1001 = visible, no mirrors, mip enabled (groups only)
0B = 0b1011 = visible, h-mirror, mip enabled (groups only)
0D = 0b1101 = visible, v-mirror, mip enabled (groups only)
0F = 0b1111 = visible, both mirrors, mip enabled (groups only)
08 = 0b1000 = hidden, no mirrors, mip enabled (groups only)
0A = 0b1010 = hidden, h-mirror, mip enabled (groups only)
0C = 0b1100 = hidden, v-mirror, mip enabled (groups only)
0E = 0b1110 = hidden, both mirrors, mip enabled (groups only)
```

#### Visual Comparison: Visible vs Hidden Mirrors

| Scenario | Code Ending | Visual | Hidden Benefit |
|----------|------------|--------|---|
| **Visible Pair (H-mirror)** | `0003` | ✅ 2 shapes shown | — |
| **Hidden Pair (H-mirror)** | `0002` | ❌ 0 shapes shown | Invisible guides at mirrored positions |
| **Visible 4-way (Both)** | `0007` | ✅ 4 shapes shown | Full visual symmetry |
| **Hidden 4-way (Both)** | `0006` | ❌ 0 shapes shown | Invisible scaffolding in all quadrants |

This design allows designers to create invisible structural guides and helper shapes that maintain mirror relationships without cluttering the visual output.

---

## Group/Canvas Structure

Shapes are typically wrapped in a **group (canvas)** element for organization and coordinate system containment:

``` text
FFFF00000000001400140000FFFFFFFF0001
<
    000200000000006400640000FFFFFFFF0001
    000202000000006400640000FFFFFFFF0001
    000202000200006400640000FFFFFFFF0001
    0002FE000000006400640000FFFFFFFF0001
    0002FE00FE00006400640000FFFFFFFF0001
    000203800380006400640000FFFFFFFF0001
>
```

**Group Header:** `FFFF00000000001400140000FFFFFFFF0001`

- Type: `FFFF` (group)
- Position: (0, 0)
- Scale: (20, 20)
- All shapes inside inherit and render relative to canvas properties

**Contained Shapes:**

| # | Code | Pos X,Y | Sca X,Y | Rot | Color | Description |
|---|------|---------|---------|-----|-------|-------------|
| 1 | `000200000000006400640000FFFFFFFF0001` | 0, 0 | 100, 100 | 0° | White | Center square |
| 2 | `000202000000006400640000FFFFFFFF0001` | 512, 0 | 100, 100 | 0° | White | Right of center |
| 3 | `000202000200006400640000FFFFFFFF0001` | 512, 512 | 100, 100 | 0° | White | Bottom-right |
| 4 | `0002FE000000006400640000FFFFFFFF0001` | -512, 0 | 100, 100 | 0° | White | Left of center |
| 5 | `0002FE00FE00006400640000FFFFFFFF0001` | -512, -512 | 100, 100 | 0° | White | Top-left |
| 6 | `000203800380006400640000FFFFFFFF0001` | 896, 896 | 100, 100 | 0° | White | Bottom-right corner |

---

## Best Practices

1. **Use mirrors for symmetry** — Reduces file size by 50–75% while maintaining visual accuracy
2. **Position from center** — Leverages natural symmetry of designs and simplifies coordinate calculations
3. **Group related shapes** — Improves organization, rendering efficiency, and readability
4. **Standardize offsets** — Use common values (512, 896) to maintain consistency
5. **Test scale ranges** — Validate that shapes render correctly at 50–300+ pixel dimensions
6. **Combine position + scale** — Position determines placement; scale determines size
7. **Verify blend modes** — Test each blend mode to understand visual effects on your specific design
8. **Use hidden mirrors for guides** — Create invisible scaffolding with hidden mirrored shapes for alignment
9. **Apply MIP to groups** — Use MIP filtering (values `08`–`0F`) on groups containing rasterized/pixelated content to smooth edges and reduce aliasing
10. **Mirror test examples:**
    - Single shape (no mirror): `...FFFFFFFF0001`
    - Horizontal pair: `...FFFFFFFF0003`
    - Vertical pair: `...FFFFFFFF0005`
    - 4-way symmetry: `...FFFFFFFF0007`

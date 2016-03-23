# bitwig-stage-control
Controller Scripts to manage Bitwig in a live performance environment using one large project.

## Goals

### Implemented

 * Immediately seek to and load a specific performance configuration without touching the computer
 * Keys and controls should always control the current performance configuration, with no possibility of accidentally changing that.
 * Load Bitwig presets containing native and/or VST plugins
 * Send program change to VSTi plugins (using plugin)
 * Map controls to currently loaded macros as completely as possible
 * Always-on access to master volume.
 * Intelligent mapping of remaining controls to plugin volumes

### Planned

 * Allow remote control using Program Change commands from MIDI IN

### Dreams

 * Find and load preset by name (via MIDI SYSEX messages? Standalone app?)
 * Map songs to patches or sequence-of-patches

## Strategy: one large project with demand-loaded presets

This design loads all possible configurations into a single project. Presets are loaded into the first device in Track 1 by searching for specially-named presets. "Current program" is also stored in a User Control for use in mappings. Each program maps to a dedicated group of 5 scenes for clip launching (configurable).

Benefits:
 * Fast load time when switching patches
 * It's the Bitwig Way, simple to code
 * By using Instrument Layers for the default device, any combination of instruments can be loaded with a patch
 * Keyboard always sends to Track 1, no danger of accidentally disabling input, no need to enable monitoring
 * Single project - can transition from one configuration to another without stopping clips or losing tempo

Drawbacks:
 * Limited number of clips per patch
 * At 5 Scenes per patch, there could be a lot of scenes
 * No way to pass raw MIDI CC data to Track 1 (worked around using note values and pizmidi's mapping plugin)
 * Controls must map to predefined macros on the presets, as mappings are not maintained when loading presets.

## What it does and how to use it

When InControl is turned off, Launchkey acts like a normal dumb MIDI controller. When it is turned on, the controller is hard wired to a performance configuration.

You will need a project with (at least) 4 tracks, where every group of 5 scenes maps to a program. So, program 2 is scene 5, program 3 is scene 10. Anything you want to control with the keyboard must be in track 1.

For best results, the first device in the first track should be an Instrument Layer, and the first device in each layer should be a CHAIN. 

(TODO: add sample project!)

 * Keyboard always goes to track 1
 * Sliders 1-4 control macros 5-8 on the first track's first device
 * Sliders 5-8 control macros 1-4 on the first device in the first layer of the first track's Instrument Layer, but only if it is a CHAIN.
 * Master slider controls the master volume.
 * knobs 1-4 control macros 5-8 of the CHAIN in the first layer of track 1.
 * Knobs 5, 6, and 7 control the volume of the first three layerse in the Instrument Layer
 * Knob 8 controls the volume of tracks 2-4
 * Pads trigger the clips in the scenes for the current patch's bank of tracks on tracks 2-4.
 * Transport controls work "normally"
 * Track Next/Prev buttons go to next/previous program

These controls work whether InControl is mapped or not:

 * Master slider always controls mater volume

### Loading Patches

The top right circle pad (red!) is a patch bank toggle button. When you hit it, the pads will display the current patch number as a bank/patch combination. Yes, this limits you to 64 patches. Yes this means you need to learn to think in base 8. :) 

When you hit the lower row (patch), the patch loads, the transport is stopped, and the keyboard exits patch bank mode. 

## Requirements

Currently supports Novation Launchkey. Will autodetect Launchkey 61, but should work without 
changes on any Launchkey v1 keyboard (grey/orange).

Oh, and you need Bitwig >= 1.3.6. And a computer.

## License

This project is made available to you under the terms of the WTFPL v2. See LICENSE.txt for the full
license text.

You can do lots of cool things with the bitwig control API. I encourage you to go do them.

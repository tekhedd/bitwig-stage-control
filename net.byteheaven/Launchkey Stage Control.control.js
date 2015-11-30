// tekHedd's Single-project patch navigator for launchkey
// 

loadAPI(1);

host.defineController("BYTE HEAVEN", "Launchkey Stage Control", "1.0.0.0", "88182079-f4b0-452c-a598-82850009d614");

host.defineMidiPorts(2, 2);
host.addDeviceNameBasedDiscoveryPair(["Launchkey 61", "MIDIIN2 (Launchkey 61)"], ["Launchkey 61", "MIDIOUT2 (Launchkey 61)"]);
host.addDeviceNameBasedDiscoveryPair(["Launchkey 61 MIDI 1", "Launchkey 61 MIDI 2"], ["Launchkey 61 MIDI 1", "Launchkey 61 MIDI 2"]); 

load("net.byteheaven.LaunchkeyBlinkeys.js");
load("net.byteheaven.LaunchkeyPatchSelectButton.js");
load("net.byteheaven.LaunchkeyCurrentPatchDisplay.js");
load("net.byteheaven.LaunchkeyClipsDisplay.js");

/**
 * @const
 * Number of scenes in each program.
 */ 
var PROGRAM_WIDTH = 5;

/**
 * We're only managing 4 rows, hard coded for the most part
 */
var BANK_HEIGHT = 4;

// NoteInput for non-InControl messages.
var keyboardNoteInput;

// Transport controls
var transport;

var sceneBank;

// Currently selected track for next/prev
var cursorTrack;

// cursorTrack's primary device, which is automatically the current track's
// primary device, which is spooky.
var primaryDevice;

// For master volume ctrl etc
var masterTrack;

// Main track bank: just the tracks, not the master or effects
var trackBank;

var blinkeys;
var currentPatchDisplay;
var clipsDisplay;

var patchSelector;

var patchSelectButton;

function instrumentRackTrack()
{
   return trackBank.getTrack( 0 ); 
};

function clipsTrack3()
{
   return trackBank.getChannel( 1 ); 
}
function clipsTrack2()
{
   return trackBank.getChannel( 2 );
}

function clipsTrack1()
{
   return trackBank.getChannel( 3 ); 
}

// Setting the value of the incontrol light also sets the value
// of incontrol for that button
function Incontrol( ctrlId )
{
   this.ctrlId = ctrlId;
}

Incontrol.prototype.send = function( isLit )
{
   var value = isLit ? 0x7f : 0x00;
   host.getMidiOutPort(1).sendMidi( 0x90, this.ctrlId, value ); // top InControl btn
};

// Toggling an InControl light also changes the incontrol state of the
// Launchkey surface, and triggers an InControl message on the input.
var incontrol_knobs = new Incontrol( 0x0d );
var incontrol_mix = new Incontrol( 0x0e );
var incontrol_pads = new Incontrol( 0x0f );

// If true, we are in inControl mode for pads (and keyboard)
var isIncontrolPads = true;

// 8 banks of 8 patches are mapped to the two rows of buttons,
// the top row is bank, the bottom row is patch.
// 
// Patch/bank selection is active when the InControl pads button is 
// active. 
function PatchSelector( currentPatchDisplay, patchUserControl )
{
   this._patchDisplay = currentPatchDisplay;
   
   // the patch number as a control
   this.patchUserControl = patchUserControl;
};

PatchSelector.prototype.recalc = function()
{
   // We want the selected scene triggered and ready to go, but the
   // transport stopped and rewound
   transport.stop();
   transport.rewind();
   
   var program = this.getCurrentProgram();
   
   host.showPopupNotification( "GOTO Program: " + (program + 1) );
   
   // TODO: use patch mapper instead of directly
   //       setting control value here.
   this.patchUserControl.set( program, 100.0 );

   // TODO: program change for plugins?
   // noteInput.sendRawMidiEvent( MIDI program change? )
   
   // Make sure "indication" is set for the right block of things
   this._scrollToSceneInternal( program );

};

//
// Calculate the current patch from the bank and patch offsets.
// Zero-indexed.
//
PatchSelector.prototype.getCurrentProgram = function()
{
   var bank = this._patchDisplay.getBank();
   var patch = this._patchDisplay.getPatch();
   return (bank * 8) + patch;
};

//
// Ensure that the current program's scene is within the current "scrollTo" page
// so that button presses based on offset will work properly.
//
PatchSelector.prototype.scrollToCurrentProgram = function()
{
   this._scrollToSceneInternal( this.getCurrentProgram() );
};

PatchSelector.prototype._scrollToSceneInternal = function( program )
{
   var rootScene = program * PROGRAM_WIDTH; // Each program is a grid if 8 scenes
   
   trackBank.scrollToChannel( 0 ); // keep the first bank of tracks selected
   trackBank.scrollToScene( rootScene );
   
   sceneBank.scrollTo( rootScene );
   
   // Don't launch scene by default... Go there, and let buttons 1-8 control that.
   // trackBank.getClipLauncherScenes().launch( this.patch );

   // Make sure the first 8 tracks are marked as "we are messing with this"
   for (var i = 0; i < BANK_HEIGHT; i++)
   {
      var track = trackBank.getTrack( i );
      if (track) 
      {
         track.getClipLauncherSlots().setIndication( true );
      }
   }
   
   clipsTrack1().getClipLauncherSlots().select( rootScene );
};

PatchSelector.prototype.reset = function()
{
   this._patchDisplay.setBank( 0 );
   this._patchDisplay.setPatch( 0 );
   this.recalc();
};

PatchSelector.prototype.setBank = function( bank )
{
   this._patchDisplay.setBank( bank ); // does range checking
   this.recalc();
};

PatchSelector.prototype.scrollPositionChanged = function( pos )
{
   // Well, this is awkward. Do we force it back where we wanted
   // it, or what?
};

PatchSelector.prototype.setPatch = function( patch )
{
   this._patchDisplay.setPatch( patch ); // does range checking
   this.recalc();
};

PatchSelector.prototype.next = function( patch )
{
   var patch = this._patchDisplay.getPatch();

   ++ patch;
   if (patch >= 8) {
      patch = 0;
      
      var bank = this._patchDisplay.getBank();
      ++ bank;
      if (bank >= 8) {
         // End of patch banks. Don't wrap.
         return; // ** QUICK EXIT **
      }
      this.setBank( bank );
   }
   
   this.setPatch( patch );
};

PatchSelector.prototype.prev = function( patch )
{
   var patch = this._patchDisplay.getPatch();
   var bank = this._patchDisplay.getBank();

   -- patch;
   if (patch < 0) {
      patch = 7;
      
      -- bank;
      if (bank < 0) {
         // Don't wrap, or do you want to go to patch 64?
         return; // ** QUICK EXIT **
      }
      this.setBank( bank );
   }

   this.setPatch( patch );
};

function init()
{
   // All note on/off on channel 1. Manually disabled with InControl-pads
   // keyboardNoteInput = host.getMidiInPort(0).createNoteInput( "Keyboard", "80????", "90????" );
   
   // Include controllers but not note on/off. We will manually forward notes to this input
   // when InControl-pads is turned off.
   keyboardNoteInput = host.getMidiInPort(0).createNoteInput( "Keys and Controls", "B001??", "D0????", "E0????" );
   keyboardNoteInput.setShouldConsumeEvents( true ); // if false, we may have a loop.
   
   // Pads: note on/off on channel 10 when InControl is off.
   host.getMidiInPort(0).createNoteInput( "Pads", "89????", "99????" );

   host.getMidiInPort(0).setMidiCallback(onMidi0);
   host.getMidiInPort(1).setMidiCallback(onMidi1);
   
	transport = host.createTransport();
   sceneBank = host.createSceneBank( PROGRAM_WIDTH );
   masterTrack = host.createMasterTrack( PROGRAM_WIDTH * 64 ); // Can't figure how to scroll the bank!
   
   cursorTrack = host.createArrangerCursorTrack( 0, PROGRAM_WIDTH );
   primaryDevice = cursorTrack.getPrimaryDevice();
   
   trackBank = host.createMainTrackBank( BANK_HEIGHT, 0, PROGRAM_WIDTH );
   
   if (! clipsTrack1())
   {
      errorln( "Expected 4 tracks. Panicing madly." );
   }

   blinkeys = new LaunchkeyBlinkeys( host.getMidiOutPort(1) );
   currentPatchDisplay = new LaunchkeyCurrentPatchDisplay( blinkeys );
   clipsDisplay = new LaunchkeyClipsDisplay( blinkeys );
   patchSelectButton = new LaunchkeyPatchSelectButton( blinkeys );
   
   var controlBank = host.createUserControls( 1 );
   var patchUserControl = controlBank.getControl( 0 );
   patchUserControl.setIndication( true ); // it's mapped
   patchUserControl.setLabel( "Patch Number" );
   
   // This does nothing like I would expect
   // patchUserControl.addValueObserver( 101, function(value) {
      // // println( "PATCH IS NOW " + value );
   // });

   patchSelector = new PatchSelector( currentPatchDisplay, patchUserControl );

   // ** Set initial state **
   
   // What shall that extra round button do?
   blinkeys.getBottomCircleLed().setColor( [0, 0] );
   
   // If the bank changes we need to update our current patch? Maybe?
   sceneBank.addScrollPositionObserver( function(pos) {
      patchSelector.scrollPositionChanged( pos );
   },
   0 );
   
   // Track the current state of the selected clips
   clipsTrack1().getClipLauncherSlots().addPlaybackStateObserver(function(slotIx, state, isQueued) {
      clipsDisplay.updatePlaybackState( 0, slotIx, state, isQueued );
   });

   clipsTrack2().getClipLauncherSlots().addPlaybackStateObserver(function(slotIx, state, isQueued) {
      clipsDisplay.updatePlaybackState( 1, slotIx, state, isQueued );
   });

   clipsTrack3().getClipLauncherSlots().addPlaybackStateObserver(function(slotIx, state, isQueued) {
      clipsDisplay.updatePlaybackState( 2, slotIx, state, isQueued );
   });

   // Enable InControl mode: C1, velocity 127
   host.getMidiOutPort(1).sendMidi( 0x90, 0x0C, 0x7F );

   incontrol_knobs.send(true); // default to InControl Stage Mode or whatever
   incontrol_mix.send(true);
   incontrol_pads.send(true);

   updateIndications();

   // host.scheduleTask(blinkTimer, null, 100);

   // Initialize stuff
   patchSelector.reset();
}

function updateIndications()
{
   // There are 8 macros. And that is that.
   for (var i = 0; i < 8; i++)
   {
      primaryDevice.getMacro(i).getAmount().setIndication(true);
   }
   
   // 8 knobs
   for (var i = 0; i < BANK_HEIGHT; i++)
   {
      trackBank.getTrack(i).getVolume().setIndication(true);
   }
}

function exit()
{
   // Disable InControl mode
   host.getMidiOutPort(1).sendMidi( 0x90, 0x0C, 0x00 );
}

function flush()
{
   // Are we in current patch mode? 
   if (patchSelectButton.getIsActive())
   {
      currentPatchDisplay.flush();
   }
   else
   {
      clipsDisplay.flush();
   }
}

function onMidi0(status, data1, data2)
{
   // if (blinkeys.masterButtonLed.isOn())
   // {
      // println( "MIDI0" );
      // printMidi(status, data1, data2);
   // }

   if (isChannelController(status))
   {
      if (data1 == 59) // Master
      {
         // This button is so cool. It just is.
         if (data2 == 127) {
            blinkeys.masterButtonLed.setIsOn( ! blinkeys.masterButtonLed.isOn() );
         }
      }
   }
   else
   {
      if (MIDIChannel(status) == 0) // channel 1
      {
         // in InControl pads mode, force keyboard notes to track 1
         if (isIncontrolPads)
         {
            if (isNoteOn(status))
            {
               instrumentRackTrack().startNote( data1, data2 );
            }
            else if (isNoteOff(status))
            {
               instrumentRackTrack().stopNote( data1, data2 );
            }
         } 
         else // note passthrough
         {
            keyboardNoteInput.sendRawMidiEvent( status, data1, data2 );
         }
      }
      else if (MIDIChannel(status) == 9)
      {
         // Retained here, well, just in case I guess.
         // if (isNoteOn(status))
         // {
            // // bottom row = 36-39, 45-47
            // // top row = 40-43, 48-51
            // if (data1 >= 36 && data1 <= 39)
            // {
               // var i = data1 - 36;
            // }
            // else if (data1 >= 44 && data1 <= 47)
            // {
               // var i = data1 - 44 + 4; 
            // }
            // else if (data1 >= 40 && data1 <= 43) // Top row left 4
            // {
               // var i = data1 - 40;
            // }
            // else if (data1 >= 48 && data1 <= 51) // Top row right 4
            // {
               // var i = data1 - 48 + 4;
            // }
         // }
      }
   }
}

function onMidi1(status, data1, data2)
{
   // if (blinkeys.masterButtonLed.isOn()) {
      // printMidi(status, data1, data2);
   // }

   if (isChannelController(status))
   {
      if (data1 >= 21 && data1 <= 28) // knob
      {
         var knobIndex = data1 - 21;
         if (knobIndex < BANK_HEIGHT)
         {
            trackBank.getTrack(knobIndex).getVolume().set(data2, 128);
         }
      }
      else if (data1 >= 41 && data1 <= 48) // slider
      {
         var sliderIndex = data1 - 41;
         primaryDevice.getMacro(sliderIndex).getAmount().set(data2, 128);
      }
      else if (data1 == 7) // MASTER
      {
         // TODO: only control master volume when MASTER lit? And then what else? 
         //       There are only 8 macros. User controls? REALLY difficult to map
         //       the control here as the mapper grabs it before we get it. :(
         
         // if (blinkeys.masterButtonLed.isOn()) 
            masterTrack.getVolume().set( data2, 128 );
         
         // else 
         // Generate a completely different control so it's mappable?
      }
      else if (data1 >= 51 && data1 <= 58) // buttons = primary presets: send notes.
      {
         var buttonIndex = data1 - 51;
         if (data2 == 127)
         {
            // Whatever shall the buttons do? I guess for now you can map them, 
            // considering that I can't prevent this anyway so whatever.
         }
      }

      if (data2 == 127)
      {
         // button presses

         if (data1 == 102) // TRACK left
         {
            patchSelector.prev();
         }
         else if (data1 == 103) // TRACK right
         {
            patchSelector.next();
         }
         else if (data1 == 112)
         {
            transport.rewind();
         }
         else if (data1 == 113)
         {
            transport.fastForward();
         }
         else if (data1 == 114)
         {
            transport.stop();
         }
         else if (data1 == 115)
         {
            transport.play();
         }
         else if (data1 == 116)
         {
            transport.toggleLoop();
         }
         else if (data1 == 117)
         {
            transport.record();
         }
         else if (data1 == 59) // Master
         {
            // This button is so cool.
            blinkeys.masterButtonLed.setIsOn( ! blinkeys.masterButtonLed.isOn() );
         }
      }
   }

   if (MIDIChannel(status) == 0) // channel 1
   {
      if (isNoteOn(status))
      {
         if (patchSelectButton.getIsActive())
         {
            if (data1 >= 96 && data1 < 104) // Pads: top row
            {
               var i = data1 - 96;
               patchSelector.setBank( i );
            }
            else if (data1 >= 112 && data1 < 120) // Pads: bottom row
            {
               var i = data1 - 112;
               patchSelector.setPatch( i );
               patchSelectButton.setState( false );
            }
         }
         else
         {
            // Map pads to clip launcher slots
            if (data1 >= 96 && data1 < 104) // Pads: top row
            {
               var i = data1 - 96;
               patchSelector.scrollToCurrentProgram(); // make sure sceneBank has the right page
               
               if (i < 4) // First four pads of clips2
               {
                  clipsTrack2().getClipLauncherSlots().select(i);
                  clipsTrack2().getClipLauncherSlots().launch(i);
               }
               else if (i < 6) // second two pads of clips3
               {
                  clipsTrack3().getClipLauncherSlots().select(i - 2);
                  clipsTrack3().getClipLauncherSlots().launch(i - 2);
               }
               else if (i == 6) // Last pad of clips2
               {
                  clipsTrack2().getClipLauncherSlots().select(4);
                  clipsTrack2().getClipLauncherSlots().launch(4);
               }
               else if (i == 7) // Last pad of clips3
               {
                  clipsTrack3().getClipLauncherSlots().select(4);
                  clipsTrack3().getClipLauncherSlots().launch(4);
               }
            }
            else if (data1 >= 112 && data1 < 120) // Pads: bottom row
            {
               var i = data1 - 112;
               patchSelector.scrollToCurrentProgram(); // make sure sceneBank has the right page
               
               if (i < 4) // First 4 pads of clips1
               {
                  clipsTrack1().getClipLauncherSlots().select(i);
                  clipsTrack1().getClipLauncherSlots().launch(i);
               }
               else if (i < 6) // pads 1-2 of clips3
               {
                  clipsTrack3().getClipLauncherSlots().select(i - 4);
                  clipsTrack3().getClipLauncherSlots().launch(i - 4);
               }
               else if (i == 6) // last pad of clips1
               {
                  clipsTrack1().getClipLauncherSlots().select(4);
                  clipsTrack1().getClipLauncherSlots().launch(4);
               }
               else if (i == 7) // The bottom right pad!
               {
                  // Launch scene?
                  // Launch the last scene in the currently selected page
                  patchSelector.scrollToCurrentProgram(); // make sure sceneBank has the right page
                  sceneBank.launchScene( 4 ); 
               }
            }
         }
         
         if (data1 == 104) // round button (top)
         {
            patchSelectButton.toggle();
         }
         else if (data1 == 120) // round button (bottom)
         {
            // Launch the last scene in the currently selected page
            patchSelector.scrollToCurrentProgram(); // make sure sceneBank has the right page
            sceneBank.launchScene( 4 ); 
         }
         else if (data1 == 13) // incontrol knobs
         {
         }
         else if (data1 == 14) // incontrol sliders
         {
         }
         else if (data1 == 15) // incontrol pads
         {
            if (data2 == 0x7f) { // max velocity = inControl on
               isIncontrolPads = true;
            }
            else {
               isIncontrolPads = false;
            }
         }
      }
   }   
}

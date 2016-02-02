
//
// Manages display of current bank/patch using InControl mode MIDI messages
//
function LaunchkeyCurrentPatchDisplay( launchkeyBlinkeys )
{
   this._blinkeys = launchkeyBlinkeys;
   
   // Cached bank/patch state, because we have multiple display modes
   this._bank = 0;
   this._patch = 0;
};

LaunchkeyCurrentPatchDisplay.prototype.getBank = function()
{
   return this._bank;
};

LaunchkeyCurrentPatchDisplay.prototype.getPatch = function()
{
   return this._patch;
};

LaunchkeyCurrentPatchDisplay.prototype.setBank = function( bank )
{
   if (bank < 0 || bank > LaunchkeyBlinkeys.ROW_LENGTH)
   {
      errorln( "Bank out of range" );
      return;
   }
   
   this._bank = bank;
};

LaunchkeyCurrentPatchDisplay.prototype.setPatch = function( patch )
{
   if (patch < 0 || patch > LaunchkeyBlinkeys.ROW_LENGTH)
   {
      errorln( "Patch out of range" );
      return;
   }
   
   this._patch = patch;
};

//
// Push current cached value to the blinkeys
//
LaunchkeyCurrentPatchDisplay.prototype.flush = function()
{
   var blinkeys = this._blinkeys;
   
   // No error checking...assuming range is checked in the set functions
   
   for (var i = 0; i < LaunchkeyBlinkeys.ROW_LENGTH; i++)
   {
      blinkeys.getTopRowLed(i).setColor([0, 1]);
   }
   
   blinkeys.getTopRowLed( this._bank ).setColor([3, 1]);
   
   for (var i = 0; i < LaunchkeyBlinkeys.ROW_LENGTH; i++)
   {
      blinkeys.getBottomRowLed(i).setColor([0, 1]);
   }
   blinkeys.getBottomRowLed( this._patch ).setColor([3, 3]);
   
   blinkeys.flush();
};

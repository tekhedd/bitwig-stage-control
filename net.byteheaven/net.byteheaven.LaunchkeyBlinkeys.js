// 
// LaunchkeyPatcherBlinkeys - abstract control over the launchkey LEDs, oh SO difficult. :/
//
function LaunchkeyOnOffLight( statusBytes, dataBytes )
{
   this._statusBytes = statusBytes;
   this._dataBytes = dataBytes;
   this._isDirty = true;
   this._isOn = false;
}

LaunchkeyOnOffLight.prototype.isOn = function()
{
   return this._isOn;
};

LaunchkeyOnOffLight.prototype.setIsOn = function( isOn )
{
   if (isOn != this._isOn)
   {
      this._isDirty = true;
      this._isOn = isOn;
   }
};

LaunchkeyOnOffLight.prototype.flush = function( port )
{
   if (!this._isDirty) {
      return;
   }
   
   var value = this._isOn ? 0x7f : 0x00;
   port.sendMidi( this._statusBytes, this._dataBytes, value );
   this._isDirty = false;
};

//
// data1Bytes - my control id bytes
// 
function LaunchkeyPadLed( data1Bytes )
{
   this._data1 = data1Bytes;
   this._isDirty = true;
   this._color = 0x11; // dim amber by default because pretty
}

LaunchkeyPadLed.prototype.setColor = function( rgPair )
{
   var red = rgPair[0];
   var green = rgPair[1];
   
   if (red > 3 || red < 0)
   {
      errorln( "LaunchkeyPadLed.SetColor: red out of range" );
      red = 3;
   }
   
   if (green > 3 || green < 0)
   {
      errorln( "LaunchkeyPadLed.SetColor: red out of range" );
      green = 3;
   }
   
   var newColor = red | (green << 4);
   if (newColor != this._color)
   {
      this._isDirty = true;
      this._color = newColor;
   }
};

//
// Flush current state to the given port, using the supplied
// status bytes
//
LaunchkeyPadLed.prototype.flush = function( port )
{
   if (this._isDirty)
   {
      // send a note-on on channel 1 for Launchkey v1 in InControl mode
      port.sendMidi( 0x90, this._data1, this._color );
      this._isDirty = false;
   }
};

///
/// All Launchkey blinkey lights together in one place
///
function LaunchkeyBlinkeys( incontrolMidiOutPort )
{ 
   this._port = incontrolMidiOutPort;
   
   this.masterButtonLed = new LaunchkeyOnOffLight( 0xb0, 0x3b );
   this.masterButtonLed.setIsOn( false );
   
   // Launchkey pads are:
   // Top: 0x60-0x68
   // Bottom: 0x70-0x78
   
   // Color is two bit, 0-3
   // 
   // Bits are 
   //  0,1 - brightness, number from 0-3
   //  2 - ??? (probably sets the OTHER color for flashing, which requires MIDI clock on Launchkey v1)
   //  3 - High bit, leave 0
   // Low nibble = red
   // High nibble = green
   // 
   // example: 0x33 is bright amber, 0x10 is dim green
   
   this._bottomRow = [
      new LaunchkeyPadLed( 0x70 ),
      new LaunchkeyPadLed( 0x71 ),
      new LaunchkeyPadLed( 0x72 ),
      new LaunchkeyPadLed( 0x73 ),
      new LaunchkeyPadLed( 0x74 ),
      new LaunchkeyPadLed( 0x75 ),
      new LaunchkeyPadLed( 0x76 ),
      new LaunchkeyPadLed( 0x77 )
   ];
   
   this._topRow = [
      new LaunchkeyPadLed( 0x60 ),
      new LaunchkeyPadLed( 0x61 ),
      new LaunchkeyPadLed( 0x62 ),
      new LaunchkeyPadLed( 0x63 ),
      new LaunchkeyPadLed( 0x64 ),
      new LaunchkeyPadLed( 0x65 ),
      new LaunchkeyPadLed( 0x66 ),
      new LaunchkeyPadLed( 0x67 )
   ];
   this._bottomCircle = new LaunchkeyPadLed( 0x78 );
   this._topCircle = new LaunchkeyPadLed( 0x68 );
};

/**
 * @const
 */
LaunchkeyBlinkeys.ROW_LENGTH = 8;
   

LaunchkeyBlinkeys.prototype.getTopRowLed = function( ix )
{
   if (ix >= LaunchkeyBlinkeys.ROW_LENGTH)
   {
      errorln( "index out of range" );
      return null;
   }
   
   return this._topRow[ix];
};

LaunchkeyBlinkeys.prototype.getBottomRowLed = function( ix )
{
   if (ix >= LaunchkeyBlinkeys.ROW_LENGTH)
   {
      errorln( "index out of range" );
      return null;
   }
   
   return this._bottomRow[ix];
};

LaunchkeyBlinkeys.prototype.getTopCircleLed = function()
{
   return this._topCircle;
};

LaunchkeyBlinkeys.prototype.getBottomCircleLed = function()
{
   return this._bottomCircle;
};

LaunchkeyBlinkeys.prototype.flush = function()
{
   var i;
   
   this.masterButtonLed.flush( this._port );
   this._bottomCircle.flush( this._port );
   this._topCircle.flush( this._port );
   
   for (i = 0; i < this._bottomRow.length; i++)
   {
      this._bottomRow[i].flush( this._port );
   }
   
   for (i = 0; i < this._topRow.length; i++)
   {
      this._topRow[i].flush( this._port );
   }
};

//
// The top circle button and patch selection state
//
function LaunchkeyPatchSelectButton( launchkeyBlinkeys )
{
   this._blinkeys = launchkeyBlinkeys;
   this._isActive = true;
   
   this.toggle(); // set initial led state
};

LaunchkeyPatchSelectButton.prototype.getIsActive = function()
{
   return this._isActive;
};

LaunchkeyPatchSelectButton.prototype.setState = function( isActive )
{
   if (isActive == this._isActive) {
      return; // no change
   }
   
   this._isActive = isActive;
   if (this._isActive)
   {
      this._blinkeys.getTopCircleLed().setColor([3, 0]); // RED
   }
   else 
   {
      this._blinkeys.getTopCircleLed().setColor([1, 0]); // dim
   }
};

LaunchkeyPatchSelectButton.prototype.toggle = function()
{
   this.setState( !this._isActive );
};


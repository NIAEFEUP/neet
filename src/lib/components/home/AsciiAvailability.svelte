<script lang="ts">
import { createAvailabilityField } from "./ascii-field";

// biome-ignore lint/correctness/noUnusedVariables: used by the canvas attachment in Svelte markup
function attachField(canvas: HTMLCanvasElement) {
	const field = createAvailabilityField(canvas);
	return () => field.destroy();
}
</script>

<figure class="availability-art" aria-label="Separate availabilities flowing into one shared time">
	<div class="field-stage">
		<div class="field-fallback" aria-hidden="true">
			<pre>       .:++:.                                  
   .:+*##*+=:..                                
          .:=+**++:..                           
  .:++:.      ..:=+*##*+=:.                     
 .:=*##**+=:..       .:=+*##*+=:.                
        ..:=+**##**+=:.     .:=+*#@@@@#*+========
 .:=+**##*+=:.    .:=+**##**+=:.                 
  .:++:.      .:=+*##*+=:.                       
         .:=+**++:..                            
   .:+*##*+=:..                                 
       .:++:.                                  </pre>
		</div>
		<canvas {@attach attachField} aria-hidden="true"></canvas>
	</div>
</figure>

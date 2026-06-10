# ContextIt: Compressed Project Context

> [!NOTE]
> **Context Slicing & Cost Reduction Metrics (Est.)**:
> - **Raw Context Size**: ~721 tokens
> - **Pruned Context Size**: ~608 tokens (**1.2x reduction**)
> - **Gemini 3.5 Flash Cost**: $0.00108 &rarr; $0.00091 (**16% savings**)

## File: `test-aimbot.py`
```python
class Vector3:
    def __init__(self, x: float, y: float, z: float):
        self.x = x
        self.y = y
        self.z = z
    
    def distance(self, other) -> float:
        return math.sqrt((self.x - other.x)**2 + (self.y - other.y)**2 + (self.z - other.z)**2)

class Entity:
    def __init__(self, pos: Vector3, health: float, team: int, is_visible: bool):
        self.position = pos
        self.health = health
        self.team = team
        self.is_visible = is_visible
        self.bone_matrix: Optional[List[List[float]]] = None

class Aimbot:
    def __init__(self):
        self.smooth_factor: float = 0.87
        self.fov: float = 38.0
        self.max_distance: float = 120.0
        self.triggerbot_enabled: bool = True
        self.headshot_priority: bool = True
    
    def find_best_target(self, entities: List[Entity], local_pos: Vector3) -> Optional[Entity]:
        """En iyi hedefi FOV + Distance + Visibility skoruna göre bulur"""
        best_target: Optional[Entity] = None
        best_score: float = float('inf')
        
        for ent in entities:
            if ent.health <= 0 or ent.team == 0 or not ent.is_visible:
                continue
                
            dist = local_pos.distance(ent.position)
            if dist > self.max_distance:
                continue
            
            if dist > self.fov:
                continue
            
            score = dist * 0.6 + (100 - ent.health) * 0.4
            
            if score < best_score:
                best_score = score
                best_target = ent
        
        if best_target:
            print(f"[Aimbot] Target locked! Dist: {best_score:.1f}")
        return best_target
    
    def run(self):
        """Ana aimbot döngüsü"""
        print("[ContextIt Aimbot] Started in background thread...")
        while True:
            time.sleep(0.008)  # \~120 FPS

def main():
    aimbot = Aimbot()
    local_player = Vector3(0, 0, 0)
    entities: List[Entity] = []
    
    entities.append(Entity(Vector3(15, 5, 0), 85, 1, True))
    entities.append(Entity(Vector3(45, 12, 0), 100, 2, True))
    
    target = aimbot.find_best_target(entities, local_player)
    aimbot.run()

```


// Baran Hoca için örnek aimbot mantığı
#include <iostream>
#include <vector>
#include <cmath>

struct Player {
    float x, y, z;
    float health;
    bool isVisible;
};

class Aimbot {
private:
    float smoothFactor = 0.85f;
    float fov = 45.0f;
    
public:
    void findTarget(const std::vector<Player>& players, float& targetX, float& targetY) {
        Player* bestTarget = nullptr;
        float bestDistance = 9999.0f;
        
        for (const auto& p : players) {
            if (!p.isVisible || p.health <= 0) continue;
            
            float dist = std::sqrt(p.x*p.x + p.y*p.y + p.z*p.z);
            if (dist < bestDistance && dist < fov) {
                bestDistance = dist;
                bestTarget = const_cast<Player*>(&p);
            }
        }
        
        if (bestTarget) {
            targetX = bestTarget->x * smoothFactor;
            targetY = bestTarget->y * smoothFactor;
            std::cout << "[Aimbot] Target locked!\n";
        }
    }
};

int main() {
    std::vector<Player> enemies;
    // ... oyun içinden entity listesi doldurulacak
    Aimbot aim;
    float tx = 0, ty = 0;
    aim.findTarget(enemies, tx, ty);
    return 0;
}

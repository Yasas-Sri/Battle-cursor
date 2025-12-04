// Battle Cursor - Complete Game Implementation
// ============================================

// Game Configuration
const CONFIG = {
    canvas: {
        width: 1200,
        height: 800
    },
    player: {
        radius: 15,
        speed: 5,
        maxHealth: 5,
        dashDistance: 150,
        dashCooldown: 3000,
        dashInvulnerability: 100,
        shootCooldown: 250,
        chargeTime: 1000,
        chargeMultiplier: 3
    },
    projectile: {
        radius: 5,
        speed: 12,
        damage: 1
    },
    wall: {
        maxLength: 150,
        duration: 2000,
        cooldown: 4000,
        thickness: 8
    },
    enemy: {
        radius: 12,
        speed: 3,
        spawnInterval: 2000,
        maxEnemies: 8,
        baseSpeed: 3,
        baseHealth: 2
    },
    powerup: {
        radius: 20,
        spawnInterval: 10000,
        duration: 8000
    },
    game: {
        matchDuration: 300, // 5 minutes
        bossWave: 10,
        difficultyScaling: {
            speedPerKill: 0.02,
            healthPerKill: 0.1,
            spawnRatePerMinute: 100
        }
    },
    combo: {
        timeout: 3000,
        multipliers: [1, 1.5, 2, 2.5, 3, 4, 5]
    },
    difficulty: {
        easy: {
            playerHealth: 50,
            enemySpeedMultiplier: 0.2,
            enemyHealthMultiplier: 0.3,
            spawnRateMultiplier: 1.5,
            damageMultiplier: 0.3
        },
        medium: {
            playerHealth: 20,
            enemySpeedMultiplier: 0.8,
            enemyHealthMultiplier: 0.8,
            spawnRateMultiplier: 1.0,
            damageMultiplier: 0.8
        },
        hard: {
            playerHealth: 10,
            enemySpeedMultiplier: 1.3,
            enemyHealthMultiplier: 1.2,
            spawnRateMultiplier: 0.7,
            damageMultiplier: 1.5
        }
    }
};

// Utility Functions
function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

function circleCircleCollision(x1, y1, r1, x2, y2, r2) {
    return distance(x1, y1, x2, y2) < r1 + r2;
}

function lineCircleCollision(x1, y1, x2, y2, cx, cy, radius) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;
    
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = (fx * fx + fy * fy) - radius * radius;
    
    let discriminant = b * b - 4 * a * c;
    
    if (discriminant >= 0) {
        discriminant = Math.sqrt(discriminant);
        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);
        
        if ((t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1)) {
            return true;
        }
    }
    return false;
}

// Game Classes
class Player {
    constructor(x, y, color = '#00ffff') {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.radius = CONFIG.player.radius;
        this.color = color;
        this.health = CONFIG.player.maxHealth;
        this.maxHealth = CONFIG.player.maxHealth;
        this.score = 0;
        this.canShoot = true;
        this.canDash = true;
        this.canPlaceWall = true;
        this.isDashing = false;
        this.isInvulnerable = false;
        this.velocityX = 0;
        this.velocityY = 0;
        this.trail = [];
        this.powerups = new Set();
        this.isCharging = false;
        this.chargeStartTime = 0;
        this.shieldHealth = 0;
        this.combo = 0;
        this.lastKillTime = 0;
    }

    move(keys, touchMovement = null) {
        // WASD and Arrow keys movement
        let moveX = 0;
        let moveY = 0;

        // Touch movement (takes priority)
        if (touchMovement) {
            moveX = touchMovement.x;
            moveY = touchMovement.y;
        } else {
            // Keyboard movement
            if (keys['w'] || keys['W'] || keys['ArrowUp']) moveY -= 1;
            if (keys['s'] || keys['S'] || keys['ArrowDown']) moveY += 1;
            if (keys['a'] || keys['A'] || keys['ArrowLeft']) moveX -= 1;
            if (keys['d'] || keys['D'] || keys['ArrowRight']) moveX += 1;
        }

        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            moveX *= 0.707;
            moveY *= 0.707;
        }

        let speed = CONFIG.player.speed;
        if (this.powerups.has('speed')) speed *= 1.5;

        this.velocityX = moveX * speed;
        this.velocityY = moveY * speed;

        this.x += this.velocityX;
        this.y += this.velocityY;

        // Boundary check
        this.x = Math.max(this.radius, Math.min(CONFIG.canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CONFIG.canvas.height - this.radius, this.y));

        // Update trail
        this.trail.push({ x: this.x, y: this.y, alpha: 1 });
        if (this.trail.length > 10) this.trail.shift();
    }

    shoot(mouseX, mouseY, isCharged = false) {
        if (!this.canShoot && !isCharged) return [];

        const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        const projectiles = [];

        if (this.powerups.has('multishot')) {
            // Fire 3 bullets in a spread
            for (let i = -1; i <= 1; i++) {
                const spreadAngle = angle + (i * 0.2);
                projectiles.push(new Projectile(this.x, this.y, spreadAngle, this.color, true, isCharged ? 3 : 1));
            }
        } else {
            projectiles.push(new Projectile(this.x, this.y, angle, this.color, true, isCharged ? 3 : 1));
        }

        const cooldown = this.powerups.has('rapid') ? 
            CONFIG.player.shootCooldown / 2 : CONFIG.player.shootCooldown;

        if (!isCharged) {
            this.canShoot = false;
            setTimeout(() => { this.canShoot = true; }, cooldown);
        }

        return projectiles;
    }

    startCharging() {
        this.isCharging = true;
        this.chargeStartTime = Date.now();
    }

    releaseCharge(mouseX, mouseY) {
        if (!this.isCharging) return [];
        
        const chargeTime = Date.now() - this.chargeStartTime;
        this.isCharging = false;
        
        if (chargeTime >= CONFIG.player.chargeTime) {
            return this.shoot(mouseX, mouseY, true);
        }
        return [];
    }

    getChargePercent() {
        if (!this.isCharging) return 0;
        const elapsed = Date.now() - this.chargeStartTime;
        return Math.min(elapsed / CONFIG.player.chargeTime, 1);
    }

    dash(mouseX, mouseY) {
        if (!this.canDash || this.isDashing) return false;

        const angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        const distance = CONFIG.player.dashDistance;

        this.x += Math.cos(angle) * distance;
        this.y += Math.sin(angle) * distance;

        // Boundary check after dash
        this.x = Math.max(this.radius, Math.min(CONFIG.canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(CONFIG.canvas.height - this.radius, this.y));

        this.isDashing = true;
        this.isInvulnerable = true;
        this.canDash = false;

        setTimeout(() => {
            this.isInvulnerable = false;
            this.isDashing = false;
        }, CONFIG.player.dashInvulnerability);

        setTimeout(() => { this.canDash = true; }, CONFIG.player.dashCooldown);

        return true;
    }

    takeDamage(amount) {
        if (this.isInvulnerable) return false;

        // Shield absorbs damage first
        if (this.shieldHealth > 0) {
            this.shieldHealth -= amount;
            if (this.shieldHealth < 0) {
                this.health += this.shieldHealth; // Overflow damage
                this.shieldHealth = 0;
            }
        } else {
            this.health -= amount;
        }

        if (this.health <= 0) {
            this.health = 0;
            return true; // Player died
        }
        return false;
    }

    addKill() {
        const now = Date.now();
        if (now - this.lastKillTime < CONFIG.combo.timeout) {
            this.combo++;
        } else {
            this.combo = 1;
        }
        this.lastKillTime = now;
    }

    getComboMultiplier() {
        const index = Math.min(this.combo - 1, CONFIG.combo.multipliers.length - 1);
        return CONFIG.combo.multipliers[Math.max(0, index)];
    }

    draw(ctx) {
        // Draw trail
        this.trail.forEach((point, index) => {
            const alpha = (index / this.trail.length) * 0.5;
            ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(point.x, point.y, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw player glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        gradient.addColorStop(0, this.color + 'ff');
        gradient.addColorStop(0.5, this.color + '88');
        gradient.addColorStop(1, this.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw player
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw invulnerability effect
        if (this.isInvulnerable) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw shield
        if (this.shieldHealth > 0) {
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
            
            // Shield pulse
            const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(255, 255, 0, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw charge indicator
        if (this.isCharging) {
            const chargePercent = this.getChargePercent();
            ctx.strokeStyle = chargePercent >= 1 ? '#ff0000' : '#ffff00';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, -Math.PI / 2, 
                    -Math.PI / 2 + (chargePercent * Math.PI * 2));
            ctx.stroke();
        }

        // Draw powerup indicator
        if (this.powerups.size > 0) {
            ctx.fillStyle = '#ffff00';
            ctx.font = '12px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText('⚡', this.x, this.y - this.radius - 10);
        }
    }
}

class Projectile {
    constructor(x, y, angle, color, isPlayer = false, damage = 1) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.projectile.radius * (damage > 1 ? 1.5 : 1);
        this.speed = CONFIG.projectile.speed;
        this.velocityX = Math.cos(angle) * this.speed;
        this.velocityY = Math.sin(angle) * this.speed;
        this.color = color;
        this.isPlayer = isPlayer;
        this.active = true;
        this.trail = [];
        this.damage = damage;
        this.bounces = 0;
        this.maxBounces = 2;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Trail effect
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 8) this.trail.shift();

        // Boundary check with bouncing
        let bounced = false;
        if (this.x < 0 || this.x > CONFIG.canvas.width) {
            if (this.bounces < this.maxBounces) {
                this.velocityX *= -1;
                this.x = Math.max(0, Math.min(CONFIG.canvas.width, this.x));
                this.bounces++;
                bounced = true;
            } else {
                this.active = false;
            }
        }
        if (this.y < 0 || this.y > CONFIG.canvas.height) {
            if (this.bounces < this.maxBounces && !bounced) {
                this.velocityY *= -1;
                this.y = Math.max(0, Math.min(CONFIG.canvas.height, this.y));
                this.bounces++;
            } else if (!bounced) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        // Draw trail
        this.trail.forEach((point, index) => {
            const alpha = (index / this.trail.length) * 0.8;
            ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.beginPath();
            ctx.arc(point.x, point.y, this.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw projectile glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        gradient.addColorStop(0, this.color + 'ff');
        gradient.addColorStop(1, this.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw projectile
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Wall {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.thickness = CONFIG.wall.thickness;
        this.active = true;
        this.opacity = 1;

        setTimeout(() => {
            this.active = false;
        }, CONFIG.wall.duration);
    }

    draw(ctx) {
        ctx.strokeStyle = `rgba(255, 0, 255, ${this.opacity})`;
        ctx.lineWidth = this.thickness;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff00ff';
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    collidesWith(x, y, radius) {
        return lineCircleCollision(this.x1, this.y1, this.x2, this.y2, x, y, radius);
    }
}

class Enemy {
    constructor(x, y, type = 'normal', difficultyMultiplier = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.active = true;
        this.shootCooldown = 0;
        this.difficultyMultiplier = difficultyMultiplier;
        
        // Type-specific properties
        const types = {
            normal: { 
                radius: 12, speed: 3, health: 2, color: '#ff0000', 
                score: 100, symbol: '●'
            },
            sniper: { 
                radius: 10, speed: 1.5, health: 1, color: '#ff00ff', 
                score: 150, symbol: '◆', shootRange: 400
            },
            tank: { 
                radius: 18, speed: 1.5, health: 8, color: '#ff8800', 
                score: 300, symbol: '■'
            },
            splitter: { 
                radius: 14, speed: 2.5, health: 3, color: '#00ff88', 
                score: 200, symbol: '◐'
            },
            kamikaze: { 
                radius: 10, speed: 5, health: 1, color: '#ffff00', 
                score: 120, symbol: '★', explosionRadius: 60
            },
            support: { 
                radius: 11, speed: 2, health: 2, color: '#8888ff', 
                score: 180, symbol: '♦', healAmount: 1
            }
        };
        
        const config = types[type] || types.normal;
        this.radius = config.radius;
        this.baseSpeed = config.speed;
        this.speed = config.speed * difficultyMultiplier;
        this.maxHealth = Math.floor(config.health * difficultyMultiplier);
        this.health = this.maxHealth;
        this.color = config.color;
        this.score = config.score;
        this.symbol = config.symbol;
        
        // Type-specific data
        this.shootRange = config.shootRange || 0;
        this.explosionRadius = config.explosionRadius || 0;
        this.healAmount = config.healAmount || 0;
        this.healCooldown = 0;
    }

    update(player, enemies) {
        if (this.type === 'sniper') {
            // Keep distance from player
            const dist = distance(this.x, this.y, player.x, player.y);
            if (dist < this.shootRange) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.x -= Math.cos(angle) * this.speed;
                this.y -= Math.sin(angle) * this.speed;
            }
        } else if (this.type === 'support') {
            // Stay back and heal others
            const dist = distance(this.x, this.y, player.x, player.y);
            if (dist < 200) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.x -= Math.cos(angle) * this.speed;
                this.y -= Math.sin(angle) * this.speed;
            }
            this.healCooldown--;
        } else {
            // Move towards player
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        }

        this.shootCooldown--;
    }

    shoot(player) {
        if (this.type !== 'sniper' && this.type !== 'normal') return null;
        
        const shootInterval = this.type === 'sniper' ? 90 : 60;
        if (this.shootCooldown <= 0) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.shootCooldown = shootInterval;
            return new Projectile(this.x, this.y, angle, this.color, false);
        }
        return null;
    }

    heal(enemies) {
        if (this.type !== 'support' || this.healCooldown > 0) return;
        
        // Find nearby damaged enemy
        for (const enemy of enemies) {
            if (enemy !== this && enemy.active && enemy.health < enemy.maxHealth) {
                const dist = distance(this.x, this.y, enemy.x, enemy.y);
                if (dist < 150) {
                    enemy.health = Math.min(enemy.health + this.healAmount, enemy.maxHealth);
                    this.healCooldown = 120; // 2 seconds
                    return enemy;
                }
            }
        }
    }

    split() {
        if (this.type === 'splitter' && this.health <= 0) {
            const splits = [];
            for (let i = 0; i < 2; i++) {
                const angle = (Math.PI * 2 * i / 2) + Math.random() * 0.5;
                const newEnemy = new Enemy(
                    this.x + Math.cos(angle) * 20,
                    this.y + Math.sin(angle) * 20,
                    'normal',
                    this.difficultyMultiplier * 0.7
                );
                newEnemy.health = 1;
                splits.push(newEnemy);
            }
            return splits;
        }
        return [];
    }

    takeDamage(amount = 1) {
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
            return true; // Enemy died
        }
        return false;
    }

    draw(ctx) {
        // Draw enemy glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
        gradient.addColorStop(0, this.color + 'ff');
        gradient.addColorStop(1, this.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw enemy
        ctx.fillStyle = this.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw health bar if damaged
        if (this.health < this.maxHealth) {
            const barWidth = this.radius * 2;
            const barHeight = 4;
            const healthPercent = this.health / this.maxHealth;
            
            ctx.fillStyle = '#000000';
            ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 10, barWidth * healthPercent, barHeight);
        }

        // Draw type symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = `${this.radius}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, this.x, this.y);
    }
}

class Boss extends Enemy {
    constructor(x, y, wave) {
        super(x, y, 'boss', 1);
        this.radius = 40;
        this.health = 50 + (wave * 20);
        this.maxHealth = this.health;
        this.speed = 2;
        this.color = '#ff0088';
        this.score = 1000;
        this.symbol = '👑';
        this.phase = 1;
        this.attackPattern = 0;
        this.attackCooldown = 0;
        this.wave = wave;
    }

    update(player, enemies) {
        // Boss phases based on health
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent < 0.33) this.phase = 3;
        else if (healthPercent < 0.66) this.phase = 2;

        this.speed = 2 + (this.phase * 0.5);
        this.attackCooldown--;

        // Movement pattern
        if (this.attackPattern % 3 === 0) {
            // Circle around player
            const angle = Math.atan2(player.y - this.y, player.x - this.x) + Math.PI / 2;
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        } else {
            // Chase player
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        }

        if (this.attackCooldown <= 0) {
            this.attackPattern++;
            this.attackCooldown = 60 / this.phase;
        }
    }

    shoot(player) {
        if (this.attackCooldown > 0) return [];
        
        const projectiles = [];
        const bulletCount = 3 + this.phase;
        
        for (let i = 0; i < bulletCount; i++) {
            const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
            const spread = (Math.PI / 4) * this.phase;
            const angle = baseAngle + (i - bulletCount / 2) * (spread / bulletCount);
            projectiles.push(new Projectile(this.x, this.y, angle, this.color, false, 2));
        }
        
        return projectiles;
    }
}

class Particle {
    constructor(x, y, color, size = 3, velocityX = 0, velocityY = 0, life = 30) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.life = life;
        this.maxLife = life;
        this.active = true;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;
        this.velocityX *= 0.98;
        this.velocityY *= 0.98;
        this.life--;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

class DamageNumber {
    constructor(x, y, damage, isCombo = false) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.isCombo = isCombo;
        this.life = 60;
        this.active = true;
        this.offsetY = 0;
    }

    update() {
        this.life--;
        this.offsetY -= 1;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        const alpha = this.life / 60;
        ctx.fillStyle = this.isCombo ? `rgba(255, 215, 0, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        ctx.font = this.isCombo ? 'bold 24px Courier New' : '18px Courier New';
        ctx.textAlign = 'center';
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.strokeText(this.damage.toString(), this.x, this.y + this.offsetY);
        ctx.fillText(this.damage.toString(), this.x, this.y + this.offsetY);
    }
}

class PowerupNotification {
    constructor(name, color) {
        this.name = name;
        this.color = color;
        this.life = 120; // 2 seconds
        this.maxLife = this.life;
        this.active = true;
        this.y = 150; // Start position
    }

    update() {
        this.life--;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        const alpha = Math.min(this.life / 30, 1); // Fade in first 0.5s, then fade out
        const fadeAlpha = this.life < 30 ? this.life / 30 : 1;
        
        // Draw background
        ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha * 0.7})`;
        ctx.fillRect(CONFIG.canvas.width / 2 - 150, this.y - 20, 300, 50);
        
        // Draw border
        ctx.strokeStyle = this.color + Math.floor(fadeAlpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 3;
        ctx.strokeRect(CONFIG.canvas.width / 2 - 150, this.y - 20, 300, 50);
        
        // Draw text
        ctx.fillStyle = this.color + Math.floor(fadeAlpha * 255).toString(16).padStart(2, '0');
        ctx.font = 'bold 20px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⚡ ${this.name.toUpperCase()} ⚡`, CONFIG.canvas.width / 2, this.y);
    }
}

class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.radius = CONFIG.powerup.radius;
        this.type = type;
        this.active = true;
        this.rotation = 0;

        const types = {
            speed: { color: '#00ff00', symbol: '⚡', name: 'Speed Boost' },
            rapid: { color: '#0000ff', symbol: '🔫', name: 'Rapid Fire' },
            shield: { color: '#ffff00', symbol: '🛡️', name: 'Shield' },
            multishot: { color: '#ff00ff', symbol: '✴️', name: 'Multi-Shot' },
            slowmo: { color: '#00ffff', symbol: '⏱️', name: 'Slow Motion' },
            magnet: { color: '#ff8800', symbol: '🧲', name: 'Magnet' },
            health: { color: '#ff0000', symbol: '❤️', name: 'Health Pack' }
        };

        this.data = types[type] || types.speed;
    }

    update() {
        this.rotation += 0.05;
    }

    draw(ctx) {
        // Draw powerup glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 1.5);
        gradient.addColorStop(0, this.data.color + '88');
        gradient.addColorStop(1, this.data.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw powerup circle
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.data.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Draw symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.data.symbol, this.x, this.y);
    }
}

// Game Engine
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.canvas.width;
        this.canvas.height = CONFIG.canvas.height;

        this.state = 'menu'; // menu, playing, gameover
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.walls = [];
        this.powerups = [];
        this.particles = [];
        this.damageNumbers = [];
        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false, rightDown: false };
        this.dragStart = null;
        this.touches = {};
        this.movementTouch = null;
        this.aimTouch = null;
        this.powerupNotifications = [];
        this.score = 0;
        this.enemiesDefeated = 0;
        this.timeElapsed = 0;
        this.lastEnemySpawn = Date.now();
        this.lastPowerupSpawn = Date.now();
        this.wave = 1;
        this.boss = null;
        this.screenShake = 0;
        this.slowMotion = 1;
        this.gameMode = 'survival';
        this.achievements = [];
        this.highScores = this.loadHighScores();
        this.difficulty = 'easy'; // Default difficulty

        this.setupEventListeners();
        this.setupUI();
        this.displayHighScores(); // Show scores on initial load
    }

    loadHighScores() {
        const saved = localStorage.getItem('battleCursorHighScores');
        return saved ? JSON.parse(saved) : [];
    }

    saveHighScore(score, kills, time) {
        this.highScores.push({ score, kills, time, date: Date.now() });
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 10);
        localStorage.setItem('battleCursorHighScores', JSON.stringify(this.highScores));
    }

    setupEventListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Mouse tracking
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });

        // Left click - Shoot or start charge
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouse.down = true;
                this.dragStart = { x: this.mouse.x, y: this.mouse.y };
                
                if (this.player) {
                    this.player.startCharging();
                }
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouse.down = false;
                
                // Check if we're placing a wall or shooting
                const dist = this.dragStart ? distance(this.dragStart.x, this.dragStart.y, this.mouse.x, this.mouse.y) : 0;
                
                if (dist > 30 && this.player && this.player.canPlaceWall) {
                    // Place wall if dragged
                    let x1 = this.dragStart.x;
                    let y1 = this.dragStart.y;
                    let x2 = this.mouse.x;
                    let y2 = this.mouse.y;

                    // Limit wall length
                    if (dist > CONFIG.wall.maxLength) {
                        const angle = Math.atan2(y2 - y1, x2 - x1);
                        x2 = x1 + Math.cos(angle) * CONFIG.wall.maxLength;
                        y2 = y1 + Math.sin(angle) * CONFIG.wall.maxLength;
                    }

                    this.walls.push(new Wall(x1, y1, x2, y2));
                    this.player.canPlaceWall = false;
                    setTimeout(() => {
                        this.player.canPlaceWall = true;
                    }, CONFIG.wall.cooldown);

                    this.updateWallCooldown();
                } else if (this.player) {
                    // Release charge shot
                    const projectiles = this.player.releaseCharge(this.mouse.x, this.mouse.y);
                    if (projectiles.length === 0) {
                        // Normal shot if not charged
                        const shots = this.player.shoot(this.mouse.x, this.mouse.y);
                        this.projectiles.push(...shots);
                    } else {
                        this.projectiles.push(...projectiles);
                        this.addScreenShake(5);
                    }
                }
                
                this.dragStart = null;
            }
        });

        // Right click - Dash
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.player && this.player.canDash) {
                const dashed = this.player.dash(this.mouse.x, this.mouse.y);
                if (dashed) this.updateDashCooldown();
            }
        });

        // Touch controls for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            
            for (let touch of e.changedTouches) {
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                // Left side for movement, right side for aiming/shooting
                if (touchX < CONFIG.canvas.width / 2) {
                    this.movementTouch = {
                        id: touch.identifier,
                        startX: touchX,
                        startY: touchY,
                        currentX: touchX,
                        currentY: touchY
                    };
                } else {
                    this.aimTouch = {
                        id: touch.identifier,
                        x: touchX,
                        y: touchY
                    };
                    this.mouse.x = touchX;
                    this.mouse.y = touchY;
                    this.mouse.down = true;
                    this.dragStart = { x: touchX, y: touchY };
                    if (this.player) {
                        this.player.startCharging();
                    }
                }
            }
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            
            for (let touch of e.changedTouches) {
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                if (this.movementTouch && touch.identifier === this.movementTouch.id) {
                    this.movementTouch.currentX = touchX;
                    this.movementTouch.currentY = touchY;
                } else if (this.aimTouch && touch.identifier === this.aimTouch.id) {
                    this.aimTouch.x = touchX;
                    this.aimTouch.y = touchY;
                    this.mouse.x = touchX;
                    this.mouse.y = touchY;
                }
            }
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            
            for (let touch of e.changedTouches) {
                if (this.movementTouch && touch.identifier === this.movementTouch.id) {
                    this.movementTouch = null;
                } else if (this.aimTouch && touch.identifier === this.aimTouch.id) {
                    // Handle shooting on touch end
                    if (this.player) {
                        const projectiles = this.player.releaseCharge(this.aimTouch.x, this.aimTouch.y);
                        if (projectiles.length === 0) {
                            const shots = this.player.shoot(this.aimTouch.x, this.aimTouch.y);
                            this.projectiles.push(...shots);
                        } else {
                            this.projectiles.push(...projectiles);
                            this.addScreenShake(5);
                        }
                    }
                    this.aimTouch = null;
                    this.mouse.down = false;
                    this.dragStart = null;
                }
            }
        });

        this.canvas.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            for (let touch of e.changedTouches) {
                if (this.movementTouch && touch.identifier === this.movementTouch.id) {
                    this.movementTouch = null;
                } else if (this.aimTouch && touch.identifier === this.aimTouch.id) {
                    this.aimTouch = null;
                    this.mouse.down = false;
                }
            }
        });
    }

    setupUI() {
        // Difficulty selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.difficulty = btn.dataset.difficulty;
            });
        });

        document.getElementById('start-solo').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('restart-button').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('menu-button').addEventListener('click', () => {
            this.showScreen('menu');
        });
    }

    showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${screen}-screen`).classList.add('active');
        this.state = screen === 'game' ? 'playing' : screen;
        
        // Update high scores display when showing menu
        if (screen === 'menu') {
            this.displayHighScores();
        }
    }

    displayHighScores() {
        const container = document.getElementById('menu-high-scores');
        if (!container) return;

        if (this.highScores.length === 0) {
            container.innerHTML = '<p class="no-scores">No scores yet. Play to set a record!</p>';
            return;
        }

        container.innerHTML = this.highScores.map((score, index) => {
            const rank = index + 1;
            const date = new Date(score.date);
            const dateStr = date.toLocaleDateString();
            const timeStr = this.formatTime(score.time);
            
            return `
                <div class="score-entry rank-${rank}">
                    <div class="score-rank">#${rank}</div>
                    <div class="score-details">
                        <div class="score-points">${score.score.toLocaleString()} pts</div>
                        <div class="score-stats">${score.kills} kills • ${timeStr} • ${dateStr}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    }

    startGame() {
        this.showScreen('game');
        
        // Apply difficulty settings
        const diffSettings = CONFIG.difficulty[this.difficulty];
        
        // Reset game state
        this.player = new Player(CONFIG.canvas.width / 2, CONFIG.canvas.height / 2);
        this.player.maxHealth = diffSettings.playerHealth;
        this.player.health = diffSettings.playerHealth;
        
        this.enemies = [];
        this.projectiles = [];
        this.walls = [];
        this.powerups = [];
        this.particles = [];
        this.damageNumbers = [];
        this.powerupNotifications = [];
        this.score = 0;
        this.enemiesDefeated = 0;
        this.timeElapsed = 0;
        this.lastEnemySpawn = Date.now();
        this.lastPowerupSpawn = Date.now();
        this.wave = 1;
        this.boss = null;
        this.slowMotion = 1;

        this.updateHUD();
        this.gameLoop();
        this.startTimer();
    }

    startTimer() {
        const timerInterval = setInterval(() => {
            if (this.state !== 'playing') {
                clearInterval(timerInterval);
                return;
            }

            this.timeElapsed++;
            document.getElementById('timer').textContent = this.timeElapsed;

            // Check for boss wave
            if (this.enemiesDefeated > 0 && this.enemiesDefeated % CONFIG.game.bossWave === 0 && !this.boss) {
                this.spawnBoss();
            }
        }, 1000);
    }

    addScreenShake(intensity) {
        this.screenShake = Math.max(this.screenShake, intensity);
    }

    createExplosion(x, y, color, count = 20) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 4;
            this.particles.push(new Particle(
                x, y, color,
                2 + Math.random() * 4,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                20 + Math.random() * 20
            ));
        }
    }

    getDifficultyMultiplier() {
        const diffSettings = CONFIG.difficulty[this.difficulty];
        const timeBonus = 1 + (this.timeElapsed / 60) * 0.5;
        const killBonus = 1 + (this.enemiesDefeated * 0.02);
        const baseMult = Math.min(timeBonus * killBonus, 3); // Cap at 3x
        
        // Apply difficulty scaling
        return baseMult * diffSettings.enemySpeedMultiplier;
    }

    getEnemySpawnInterval() {
        const diffSettings = CONFIG.difficulty[this.difficulty];
        const baseInterval = CONFIG.enemy.spawnInterval;
        const reduction = (this.timeElapsed / 60) * 100;
        const interval = Math.max(baseInterval - reduction, 500);
        
        // Apply difficulty spawn rate (lower = faster spawning)
        return interval * diffSettings.spawnRateMultiplier;
    }

    spawnEnemy() {
        const side = Math.floor(Math.random() * 4);
        let x, y;

        switch(side) {
            case 0: x = Math.random() * CONFIG.canvas.width; y = -20; break;
            case 1: x = CONFIG.canvas.width + 20; y = Math.random() * CONFIG.canvas.height; break;
            case 2: x = Math.random() * CONFIG.canvas.width; y = CONFIG.canvas.height + 20; break;
            case 3: x = -20; y = Math.random() * CONFIG.canvas.height; break;
        }

        // Determine enemy type based on wave progression
        const types = ['normal', 'normal', 'normal', 'sniper', 'tank', 'splitter', 'kamikaze', 'support'];
        const weights = this.wave < 3 ? [0.7, 0.3] : 
                       this.wave < 5 ? [0.5, 0.2, 0.15, 0.15] :
                       [0.3, 0.15, 0.15, 0.15, 0.15, 0.1];
        
        let random = Math.random();
        let typeIndex = 0;
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                typeIndex = i;
                break;
            }
        }

        const type = types[Math.min(typeIndex, types.length - 1)];
        const diffSettings = CONFIG.difficulty[this.difficulty];
        const diffMult = this.getDifficultyMultiplier() * diffSettings.enemyHealthMultiplier;
        this.enemies.push(new Enemy(x, y, type, diffMult));
    }

    spawnBoss() {
        const x = CONFIG.canvas.width / 2;
        const y = -50;
        const bossWave = Math.floor(this.enemiesDefeated / CONFIG.game.bossWave);
        this.boss = new Boss(x, y, bossWave);
        
        // Apply difficulty to boss
        const diffSettings = CONFIG.difficulty[this.difficulty];
        this.boss.health = Math.floor(this.boss.health * diffSettings.enemyHealthMultiplier);
        this.boss.maxHealth = this.boss.health;
        this.boss.speed *= diffSettings.enemySpeedMultiplier;
        
        this.enemies.push(this.boss);
        this.addScreenShake(10);
    }

    spawnPowerup() {
        const types = ['speed', 'rapid', 'shield', 'multishot', 'slowmo', 'magnet', 'health'];
        const type = types[Math.floor(Math.random() * types.length)];
        const x = 50 + Math.random() * (CONFIG.canvas.width - 100);
        const y = 50 + Math.random() * (CONFIG.canvas.height - 100);
        
        this.powerups.push(new Powerup(x, y, type));
    }

    update() {
        if (this.state !== 'playing' || !this.player) return;

        // Apply slow motion
        const iterations = this.player.powerups.has('slowmo') ? 0.5 : 1;
        
        for (let iter = 0; iter < iterations; iter++) {
            // Calculate touch movement vector
            let touchMovement = null;
            if (this.movementTouch) {
                const dx = this.movementTouch.currentX - this.movementTouch.startX;
                const dy = this.movementTouch.currentY - this.movementTouch.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5) { // Dead zone
                    touchMovement = {
                        x: dx / Math.max(distance, 50), // Normalize with max sensitivity
                        y: dy / Math.max(distance, 50)
                    };
                }
            }
            
            // Update player
            this.player.move(this.keys, touchMovement);

            // Check combo timeout
            if (Date.now() - this.player.lastKillTime > CONFIG.combo.timeout) {
                this.player.combo = 0;
            }

            // Spawn enemies
            const now = Date.now();
            const spawnInterval = this.getEnemySpawnInterval();
            const maxEnemies = CONFIG.enemy.maxEnemies + Math.floor(this.wave / 2);
            
            if (now - this.lastEnemySpawn > spawnInterval && 
                this.enemies.length < maxEnemies) {
                this.spawnEnemy();
                this.lastEnemySpawn = now;
            }

            // Spawn powerups
            if (now - this.lastPowerupSpawn > CONFIG.powerup.spawnInterval) {
                this.spawnPowerup();
                this.lastPowerupSpawn = now;
            }

            // Update enemies
            this.enemies.forEach(enemy => {
                enemy.update(this.player, this.enemies);

                // Enemy shooting
                if (enemy instanceof Boss) {
                    const bossProjectiles = enemy.shoot(this.player);
                    this.projectiles.push(...bossProjectiles);
                } else {
                    const projectile = enemy.shoot(this.player);
                    if (projectile) this.projectiles.push(projectile);
                }

                // Support healing
                if (enemy.type === 'support') {
                    const healed = enemy.heal(this.enemies);
                    if (healed) {
                        this.createExplosion(healed.x, healed.y, '#00ff00', 10);
                    }
                }

                // Check collision with player
                if (circleCircleCollision(
                    enemy.x, enemy.y, enemy.radius,
                    this.player.x, this.player.y, this.player.radius
                )) {
                    // Kamikaze explosion
                    if (enemy.type === 'kamikaze') {
                        this.createExplosion(enemy.x, enemy.y, enemy.color, 40);
                        this.addScreenShake(8);
                        // Damage nearby enemies
                        this.enemies.forEach(other => {
                            if (other !== enemy && distance(enemy.x, enemy.y, other.x, other.y) < enemy.explosionRadius) {
                                other.takeDamage(2);
                            }
                        });
                    }

                    const diffSettings = CONFIG.difficulty[this.difficulty];
                    const baseDamage = enemy.type === 'kamikaze' ? 2 : 1;
                    const damage = Math.ceil(baseDamage * diffSettings.damageMultiplier);
                    const died = this.player.takeDamage(damage);
                    if (died) this.gameOver();
                    enemy.active = false;
                    this.createExplosion(enemy.x, enemy.y, enemy.color);
                    this.addScreenShake(3);
                    this.updateHUD();
                }
            });

            // Update projectiles
            this.projectiles.forEach(projectile => {
                projectile.update();

                // Check wall collisions
                this.walls.forEach(wall => {
                    if (wall.active && wall.collidesWith(projectile.x, projectile.y, projectile.radius)) {
                        projectile.active = false;
                        this.createExplosion(projectile.x, projectile.y, projectile.color, 8);
                    }
                });

                // Check player projectile hits enemies
                if (projectile.isPlayer) {
                    this.enemies.forEach(enemy => {
                        if (enemy.active && circleCircleCollision(
                            projectile.x, projectile.y, projectile.radius,
                            enemy.x, enemy.y, enemy.radius
                        )) {
                            projectile.active = false;
                            const died = enemy.takeDamage(projectile.damage);
                            
                            // Create damage number
                            this.damageNumbers.push(new DamageNumber(
                                enemy.x, enemy.y, 
                                projectile.damage * 100,
                                this.player.combo > 1
                            ));
                            
                            if (died) {
                                // Handle splitter
                                const splits = enemy.split();
                                this.enemies.push(...splits);
                                
                                // Boss defeated
                                if (enemy instanceof Boss) {
                                    this.boss = null;
                                    this.wave++;
                                    this.addScreenShake(15);
                                }
                                
                                this.player.addKill();
                                const baseScore = enemy.score || 100;
                                const comboScore = Math.floor(baseScore * this.player.getComboMultiplier());
                                this.score += comboScore;
                                this.enemiesDefeated++;
                                this.createExplosion(enemy.x, enemy.y, enemy.color, 20);
                                this.addScreenShake(4);
                                this.updateHUD();
                            }
                        }
                    });
                }
                // Check enemy projectile hits player
                else {
                    if (circleCircleCollision(
                        projectile.x, projectile.y, projectile.radius,
                        this.player.x, this.player.y, this.player.radius
                    )) {
                        projectile.active = false;
                        const diffSettings = CONFIG.difficulty[this.difficulty];
                        const damage = Math.ceil(projectile.damage * diffSettings.damageMultiplier);
                        const died = this.player.takeDamage(damage);
                        this.createExplosion(this.player.x, this.player.y, '#ffffff', 15);
                        this.addScreenShake(5);
                        if (died) this.gameOver();
                        this.updateHUD();
                    }
                }
            });

            // Update powerups
            this.powerups.forEach(powerup => {
                powerup.update();

                // Magnet effect
                if (this.player.powerups.has('magnet')) {
                    const dist = distance(powerup.x, powerup.y, this.player.x, this.player.y);
                    if (dist < 200) {
                        const angle = Math.atan2(this.player.y - powerup.y, this.player.x - powerup.x);
                        powerup.x += Math.cos(angle) * 3;
                        powerup.y += Math.sin(angle) * 3;
                    }
                }

                if (circleCircleCollision(
                    powerup.x, powerup.y, powerup.radius,
                    this.player.x, this.player.y, this.player.radius
                )) {
                    powerup.active = false;
                    
                    // Show notification
                    this.powerupNotifications.push(new PowerupNotification(
                        powerup.data.name,
                        powerup.data.color
                    ));
                    
                    // Apply powerup effect
                    if (powerup.type === 'shield') {
                        this.player.shieldHealth = 3;
                    } else if (powerup.type === 'health') {
                        // Restore 2 HP, but don't exceed max health
                        this.player.health = Math.min(this.player.health + 2, this.player.maxHealth);
                    } else {
                        this.player.powerups.add(powerup.type);
                        setTimeout(() => {
                            this.player.powerups.delete(powerup.type);
                        }, CONFIG.powerup.duration);
                    }
                    
                    this.score += 50;
                    this.createExplosion(powerup.x, powerup.y, powerup.data.color, 15);
                    this.updateHUD();
                }
            });

            // Update particles
            this.particles.forEach(p => p.update());
            this.damageNumbers.forEach(d => d.update());
            this.powerupNotifications.forEach(n => n.update());

            // Update screen shake
            if (this.screenShake > 0) this.screenShake *= 0.9;
            if (this.screenShake < 0.1) this.screenShake = 0;

            // Remove inactive entities
            this.enemies = this.enemies.filter(e => e.active);
            this.projectiles = this.projectiles.filter(p => p.active);
            this.walls = this.walls.filter(w => w.active);
            this.powerups = this.powerups.filter(p => p.active);
            this.particles = this.particles.filter(p => p.active);
            this.damageNumbers = this.damageNumbers.filter(d => d.active);
            this.powerupNotifications = this.powerupNotifications.filter(n => n.active);
        }
    }

    draw() {
        // Apply screen shake
        this.ctx.save();
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShake;
            const shakeY = (Math.random() - 0.5) * this.screenShake;
            this.ctx.translate(shakeX, shakeY);
        }

        // Clear canvas
        this.ctx.fillStyle = 'rgba(0, 10, 20, 0.2)';
        this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

        // Slow-mo effect overlay
        if (this.player && this.player.powerups.has('slowmo')) {
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
            this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
        }

        // Draw grid effect
        this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < CONFIG.canvas.width; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(i, 0);
            this.ctx.lineTo(i, CONFIG.canvas.height);
            this.ctx.stroke();
        }
        for (let i = 0; i < CONFIG.canvas.height; i += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i);
            this.ctx.lineTo(CONFIG.canvas.width, i);
            this.ctx.stroke();
        }

        // Draw particles (background layer)
        this.particles.forEach(particle => particle.draw(this.ctx));

        // Draw walls
        this.walls.forEach(wall => wall.draw(this.ctx));

        // Draw powerups
        this.powerups.forEach(powerup => powerup.draw(this.ctx));

        // Draw projectiles
        this.projectiles.forEach(projectile => projectile.draw(this.ctx));

        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Draw player
        if (this.player) this.player.draw(this.ctx);

        // Draw damage numbers
        this.damageNumbers.forEach(dmg => dmg.draw(this.ctx));

        // Draw powerup notifications
        this.powerupNotifications.forEach(notification => notification.draw(this.ctx));

        // Draw combo indicator
        if (this.player && this.player.combo > 1) {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.font = 'bold 36px Courier New';
            this.ctx.textAlign = 'center';
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 4;
            const comboText = `${this.player.combo}x COMBO!`;
            this.ctx.strokeText(comboText, CONFIG.canvas.width / 2, 80);
            this.ctx.fillText(comboText, CONFIG.canvas.width / 2, 80);
            
            const mult = this.player.getComboMultiplier();
            this.ctx.font = '20px Courier New';
            this.ctx.fillText(`${mult.toFixed(1)}x Score`, CONFIG.canvas.width / 2, 110);
        }

        // Draw drag preview for wall
        if (this.dragStart && this.mouse.down) {
            const dist = distance(this.dragStart.x, this.dragStart.y, this.mouse.x, this.mouse.y);
            
            if (dist > 30) {
                let x2 = this.mouse.x;
                let y2 = this.mouse.y;

                if (dist > CONFIG.wall.maxLength) {
                    const angle = Math.atan2(y2 - this.dragStart.y, x2 - this.dragStart.x);
                    x2 = this.dragStart.x + Math.cos(angle) * CONFIG.wall.maxLength;
                    y2 = this.dragStart.y + Math.sin(angle) * CONFIG.wall.maxLength;
                }

                this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
                this.ctx.lineWidth = CONFIG.wall.thickness;
                this.ctx.setLineDash([5, 5]);
                this.ctx.beginPath();
                this.ctx.moveTo(this.dragStart.x, this.dragStart.y);
                this.ctx.lineTo(x2, y2);
                this.ctx.stroke();
                this.ctx.setLineDash([]);
            }
        }

        // Draw crosshair at mouse position
        const chargePercent = this.player ? this.player.getChargePercent() : 0;
        this.ctx.strokeStyle = chargePercent >= 1 ? '#ff0000' : '#00ffff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.mouse.x - 10, this.mouse.y);
        this.ctx.lineTo(this.mouse.x + 10, this.mouse.y);
        this.ctx.moveTo(this.mouse.x, this.mouse.y - 10);
        this.ctx.lineTo(this.mouse.x, this.mouse.y + 10);
        this.ctx.stroke();

        // Draw charge circle
        if (chargePercent > 0) {
            this.ctx.strokeStyle = chargePercent >= 1 ? '#ff0000' : '#ffff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(this.mouse.x, this.mouse.y, 20, 0, Math.PI * 2 * chargePercent);
            this.ctx.stroke();
        }

        // Draw touch controls visualization
        if (this.movementTouch) {
            // Draw joystick base
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.movementTouch.startX, this.movementTouch.startY, 50, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Draw joystick knob
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(this.movementTouch.currentX, this.movementTouch.currentY, 25, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw line from base to knob
            this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(this.movementTouch.startX, this.movementTouch.startY);
            this.ctx.lineTo(this.movementTouch.currentX, this.movementTouch.currentY);
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    updateHUD() {
        document.getElementById('score').textContent = this.score;
        const healthPercent = (this.player.health / this.player.maxHealth) * 100;
        document.getElementById('health-fill').style.width = healthPercent + '%';
        
        // Update combo
        const comboEl = document.getElementById('combo');
        if (comboEl) {
            comboEl.textContent = this.player.combo > 1 ? `${this.player.combo}x` : '-';
            comboEl.style.color = this.player.combo > 1 ? '#ffd700' : '#00ffff';
        }
        
        // Update wave
        const waveEl = document.getElementById('wave');
        if (waveEl) waveEl.textContent = this.wave;
        
        // Update kills
        const killsEl = document.getElementById('kills');
        if (killsEl) killsEl.textContent = this.enemiesDefeated;
    }

    updateDashCooldown() {
        const cooldownEl = document.getElementById('dash-cooldown');
        cooldownEl.classList.add('cooling');
        setTimeout(() => {
            cooldownEl.classList.remove('cooling');
        }, CONFIG.player.dashCooldown);
    }

    updateWallCooldown() {
        const cooldownEl = document.getElementById('wall-cooldown');
        cooldownEl.classList.add('cooling');
        setTimeout(() => {
            cooldownEl.classList.remove('cooling');
        }, CONFIG.wall.cooldown);
    }

    gameOver() {
        this.state = 'gameover';
        
        // Save high score
        this.saveHighScore(this.score, this.enemiesDefeated, this.timeElapsed);
        
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('enemies-defeated').textContent = this.enemiesDefeated;
        document.getElementById('time-survived').textContent = this.timeElapsed;
        
        const waveEl = document.getElementById('final-wave');
        if (waveEl) waveEl.textContent = this.wave;
        
        const maxComboEl = document.getElementById('max-combo');
        if (maxComboEl) maxComboEl.textContent = this.player ? this.player.combo : 0;

        this.showScreen('game-over');
    }

    gameLoop() {
        if (this.state === 'playing') {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        }
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    const game = new Game();
});

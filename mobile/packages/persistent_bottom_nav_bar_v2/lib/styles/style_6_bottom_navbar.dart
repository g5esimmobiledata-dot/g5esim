part of "../persistent_bottom_nav_bar_v2.dart";

class Style6BottomNavBar extends StatefulWidget {
  const Style6BottomNavBar({
    required this.navBarConfig,
    this.navBarDecoration = const NavBarDecoration(),
    this.itemAnimationProperties = const ItemAnimation(),
    this.height,
    super.key,
  });

  final NavBarConfig navBarConfig;
  final NavBarDecoration navBarDecoration;
  final double? height;

  /// This controls the animation properties of the items of the NavBar.
  final ItemAnimation itemAnimationProperties;

  @override
  State<Style6BottomNavBar> createState() => _Style6BottomNavBarState();
}

class _Style6BottomNavBarState extends State<Style6BottomNavBar>
    with TickerProviderStateMixin {
  late List<AnimationController> _animationControllerList;
  late List<Animation<double>> _animationList;

  late int _selectedIndex;

  @override
  void initState() {
    super.initState();
    _selectedIndex = _safeSelectedIndex(widget.navBarConfig.selectedIndex);
    _createAnimationControllers();

    _ambiguate(WidgetsBinding.instance)!.addPostFrameCallback((_) {
      if (!mounted || _animationControllerList.isEmpty) {
        return;
      }

      _animationControllerList[_selectedIndex].forward();
    });
  }

  int _safeSelectedIndex(int index) {
    final itemCount = widget.navBarConfig.items.length;
    if (itemCount <= 0) {
      return 0;
    }
    if (index < 0) {
      return 0;
    }
    if (index >= itemCount) {
      return itemCount - 1;
    }
    return index;
  }

  void _createAnimationControllers() {
    _animationControllerList = List<AnimationController>.empty(growable: true);
    _animationList = List<Animation<double>>.empty(growable: true);

    for (int i = 0; i < widget.navBarConfig.items.length; ++i) {
      final animationController = AnimationController(
        duration: widget.itemAnimationProperties.duration,
        vsync: this,
      );
      _animationControllerList.add(animationController);
      _animationList.add(
        Tween(begin: 0.95, end: 1.18)
            .chain(CurveTween(curve: widget.itemAnimationProperties.curve))
            .animate(animationController),
      );
    }
  }

  void _disposeAnimationControllers() {
    for (final controller in _animationControllerList) {
      controller.dispose();
    }
  }

  Widget _buildItem(ItemConfig item, bool isSelected, int itemIndex) =>
      AnimatedBuilder(
        animation: _animationList[itemIndex],
        builder: (context, child) => Transform.scale(
          scale: _animationList[itemIndex].value,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              IconTheme(
                data: IconThemeData(
                  size: item.iconSize,
                  color: isSelected
                      ? item.activeForegroundColor
                      : item.inactiveForegroundColor,
                ),
                child: isSelected ? item.icon : item.inactiveIcon,
              ),
              if (item.title != null)
                FittedBox(
                  child: Text(
                    item.title!,
                    style: item.textStyle.apply(
                      color: isSelected
                          ? item.activeForegroundColor
                          : item.inactiveForegroundColor,
                    ),
                  ),
                ),
            ],
          ),
        ),
      );

  @override
  void dispose() {
    _disposeAnimationControllers();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant Style6BottomNavBar oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.navBarConfig.items.length !=
        widget.navBarConfig.items.length) {
      _disposeAnimationControllers();
      _selectedIndex = _safeSelectedIndex(widget.navBarConfig.selectedIndex);
      _createAnimationControllers();

      _ambiguate(WidgetsBinding.instance)!.addPostFrameCallback((_) {
        if (!mounted || _animationControllerList.isEmpty) {
          return;
        }

        _animationControllerList[_selectedIndex].forward();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final nextSelectedIndex = _safeSelectedIndex(
      widget.navBarConfig.selectedIndex,
    );

    if (nextSelectedIndex != _selectedIndex &&
        _animationControllerList.isNotEmpty) {
      _animationControllerList[_selectedIndex].reverse();
      _selectedIndex = nextSelectedIndex;
      _animationControllerList[_selectedIndex].forward();
    }
    return DecoratedNavBar(
      decoration: widget.navBarDecoration,
      height: widget.height,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: widget.navBarConfig.items.map((item) {
          final int index = widget.navBarConfig.items.indexOf(item);
          return Expanded(
            child: InkWell(
              onTap: () {
                widget.navBarConfig.onItemSelected(index);
              },
              child: _buildItem(
                item,
                widget.navBarConfig.selectedIndex == index,
                index,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

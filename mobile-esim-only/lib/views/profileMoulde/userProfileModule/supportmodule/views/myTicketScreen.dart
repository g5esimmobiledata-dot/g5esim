import 'package:easy_localization/easy_localization.dart';
import 'package:esimconnect/core/bloc/api_state.dart';
import 'package:esimconnect/utills/appColors.dart';
import 'package:esimconnect/utills/global.dart' as global;
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/bloc/tickets_bloc/ticket_bloc.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/bloc/tickets_bloc/ticket_event.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/model/ticketModel.dart';
import 'package:esimconnect/views/profileMoulde/userProfileModule/supportmodule/views/SupportChatScreen.dart';
import 'package:esimconnect/widgets/customBottomButton.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:get/get.dart';
import 'package:sizer/sizer.dart';

class MyTicketsScrren extends StatefulWidget {
  const MyTicketsScrren({super.key});

  @override
  State<MyTicketsScrren> createState() => _MyTicketsScrrenState();
}

class _MyTicketsScrrenState extends State<MyTicketsScrren> {
  List<Datum>? _listdata = [];
  bool isAnyTicketOpened = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
      context.read<TicketsBloc>().add(TicketEvent());
    });
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async {
        WidgetsBinding.instance.addPostFrameCallback((timeStamp) {
          context.read<TicketsBloc>().add(TicketEvent());
        });
      },
      child: SafeArea(
        child: Scaffold(
          appBar: AppBar(title: Text("My Tickets").tr()),
          body: BlocConsumer<TicketsBloc, ApiState<TicketsModel>>(
            listener: (context, state) {
              if (state is ApiSuccess) {
                _listdata = state.data?.data?.data?.reversed.toList();
                isAnyTicketOpened = _listdata!.any(
                  (item) => item.status?.toLowerCase().trim() == "open",
                );
                setState(() {});
              }
            },
            builder: (context, state) {
              if (state is ApiLoading) {
                return Center(child: CircularProgressIndicator());
              } else if (state is ApiFailure) {
                return SizedBox.shrink();
              }

              if (_listdata!.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Icon with background
                      Container(
                        padding: EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.confirmation_num_outlined,
                          size: 64,
                          color: Colors.grey[400],
                        ),
                      ),

                      SizedBox(height: 24),

                      // Title
                      Text(
                        "No Tickets Yet",
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.normal,
                          color: Colors.grey[700],
                        ),
                      ),

                      SizedBox(height: 12),

                      // Description
                      Text(
                        "You don't have any tickets yet!",
                        style: TextStyle(fontSize: 16, color: Colors.grey[500]),
                      ).tr(),

                      SizedBox(height: 32),
                    ],
                  ),
                );
              }

              return ListView.builder(
                padding: EdgeInsets.all(12),
                itemCount: _listdata!.length,
                itemBuilder: (context, index) {
                  return InkWell(
                    onTap: () {
                      Get.to(
                        () => SupportChatScreen(
                          ticketId: _listdata![index].id,
                          istileRequired: false,
                        ),
                      );
                    },
                    child: Container(
                      margin: EdgeInsets.only(bottom: 10),
                      padding: EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          // Note: Changed from "open" to "open" (same)
                          color:
                              _listdata![index].status?.toLowerCase() == "open"
                              ? AppColors.darkgreen.withOpacity(0.5)
                              : AppColors.redColor.withOpacity(0.5),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black12,
                            blurRadius: 2,
                            offset: Offset(0, 1),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  // Changed from subject to title
                                  _listdata![index].title ?? tr("No Title"),
                                  style: Theme.of(context).textTheme.bodyLarge!
                                      .copyWith(
                                        fontWeight: FontWeight.normal,
                                        fontSize: 16.sp,
                                      ),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              SizedBox(width: 10),
                              Text.rich(
                                TextSpan(
                                  children: [
                                    TextSpan(
                                      text: tr("Status: "),
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyLarge!
                                          .copyWith(
                                            fontWeight: FontWeight.normal,
                                            fontSize: 15.sp,
                                            color: AppColors.primaryColor,
                                          ),
                                    ),
                                    TextSpan(
                                      text:
                                          _listdata![index].status
                                              ?.toUpperCase() ??
                                          "UNKNOWN",
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodyLarge!
                                          .copyWith(
                                            fontWeight: FontWeight.w400,
                                            fontSize: 15.sp,
                                            color:
                                                (_listdata![index].status
                                                        ?.toLowerCase() ==
                                                    "open")
                                                ? AppColors.darkgreen
                                                : AppColors.redColor,
                                          ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          SizedBox(height: 4),
                          Text(
                            "Priority: ${_listdata![index].priority?.toUpperCase() ?? "N/A"}",
                            style: Theme.of(context).textTheme.bodyLarge!
                                .copyWith(
                                  fontWeight: FontWeight.w400,
                                  fontSize: 15.sp,
                                  color: AppColors.textColor,
                                ),
                          ),
                          SizedBox(height: 4),
                          if (_listdata![index].createdAt != null)
                            Text(
                              "Raised On: ${DateFormat('MMM dd, yyyy HH:mm a').format(_listdata![index].createdAt!)}",
                              style: Theme.of(context).textTheme.bodyLarge!
                                  .copyWith(
                                    fontWeight: FontWeight.w400,
                                    fontSize: 15.sp,
                                    color: AppColors.textColor,
                                  ),
                            ),
                          SizedBox(height: 4),
                          if (_listdata![index].description != null)
                            Text(
                              "Description: ${_listdata![index].description}",
                              style: Theme.of(context).textTheme.bodyLarge!
                                  .copyWith(
                                    fontWeight: FontWeight.w400,
                                    fontSize: 14.sp,
                                    color: AppColors.textColor.withOpacity(0.8),
                                  ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          SizedBox(height: 4),

                          if (_listdata![index].assignedToName != null)
                            Text(
                              "Assigned To: ${_listdata![index].assignedToName}",
                              style: Theme.of(context).textTheme.bodyLarge!
                                  .copyWith(
                                    fontWeight: FontWeight.w400,
                                    fontSize: 14.sp,
                                    color: AppColors.textColor.withOpacity(0.8),
                                  ),
                            ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
          bottomSheet: Container(
            padding: EdgeInsets.only(bottom: 10, left: 3.w, right: 3.w),
            child: CustomBottomButton(
              title: "Raise a Ticket",
              onTap: isAnyTicketOpened
                  ? () {
                      global.showToastMessage(
                        message: tr("You have already an open ticket"),
                      );
                    }
                  : () {
                      Get.to(() => SupportChatScreen(istileRequired: true));
                    },
            ),
          ),
        ),
      ),
    );
  }
}
